import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { Client } from "pg";

const DATABASE_URL_PARAM = "/aberpack/prod/database_url";

export const handler = async () => {
  const ssm = new SSMClient({});
  const { Parameter } = await ssm.send(
    new GetParameterCommand({ Name: DATABASE_URL_PARAM, WithDecryption: true }),
  );

  const client = new Client({ connectionString: Parameter.Value });
  await client.connect();
  try {
    // Section 3.8: purges events (and cascaded event_rsvps/event_messages,
    // via ON DELETE CASCADE) once they're 14 days past event_datetime.
    const result = await client.query(
      "delete from events where event_datetime < now() - interval '14 days'",
    );
    console.log(`aberpack-retention-cleanup: purged ${result.rowCount} event(s)`);
  } finally {
    await client.end();
  }
};
