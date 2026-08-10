# aberpack-stack deploy notes

`aberpack-stack.yaml` is deployed with a **two-pass sequence**, not a single
`cloudformation deploy`, because of an ordering constraint discovered during
the first M0 deploy: a `AWS::Lightsail::Container`'s `PublicDomainNames`
cannot reference a certificate that is still `PENDING_VALIDATION`, and a
freshly-created `AWS::Lightsail::Certificate` always starts in that state —
CloudFormation alone can't express "wait for DNS validation to complete."

## Pass 1 — everything except the domain binding

Deploy with `PublicDomainNames` omitted from `AberpackContainerService` and
the `ApexDnsRecord` resource absent. This creates the S3 bucket, the
certificate (PENDING_VALIDATION), the container service (reachable at its
default `*.cs.amazonlightsail.com` domain), and the Lambda/Scheduler
skeleton.

## Bootstrap the certificate's DNS validation record

```
aws lightsail get-certificates --certificate-name aberpack-cert \
  --include-certificate-details --region us-east-1
```

Read `certificateDetail.domainValidationRecords[0].resourceRecord`
(`name`/`type`/`value`) and add it to the `theabernathypack.com` hosted zone
as a CNAME (`route53 change-resource-record-sets`). Lightsail attempts to
create this record itself and will report
`dnsRecordCreationState: FAILED — User not authorized` — that's Lightsail's
own internal automation, unrelated to `theabernathypack-dev-role`; adding it
manually via our own Route53 permissions is expected.

Poll `certificateDetail.status` until it flips to `ISSUED` (typically a few
minutes after the CNAME propagates).

## Pass 2 — bind the domain

Add `PublicDomainNames` back to `AberpackContainerService` and add the
`ApexDnsRecord` resource (an `A`/Alias record using Lightsail's fixed
per-region alias hosted zone ID — `Z06246771KYU0IRHI74W4` for `us-east-1` —
and the container service's `Url` output with the `https://` scheme and
trailing slash stripped via `Fn::Select`/`Fn::Split`). Redeploy.

Future stack updates that don't touch the certificate or domain binding can
just be single-pass `cloudformation deploy` runs against the full template
as-is.
