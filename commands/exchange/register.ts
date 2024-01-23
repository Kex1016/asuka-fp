import databaseConnection, { ExchangeType } from "@/utils/database.js";
import { command } from "@/utils/dfp.js";
import { options } from "@discord-fp/djs";

const db = databaseConnection.getDatabase();
export default command.slash({
  description: "Register for an exchange",
  options: {
    exchange: options.number({
      description: "The exchange you want to register for. Be warned that THIS IS FINAL!",
      required: true,
      async autoComplete(e) {
        const exchanges = await new Promise(resolve => {
          db.all(`SELECT * FROM Exchange;`, (err, rows) => {
            if (err) {
              resolve([]);
            } else {
              const retObj: ExchangeType[] = [];

              for (const row of rows) {
                const _r = row as ExchangeType;

                retObj.push({
                  id: _r.id,
                  name: _r.name,
                  description: _r.description,
                  theme: _r.theme,
                  start: new Date((row as {start: string | number}).start),
                  end: new Date((row as {end: string | number}).end),
                  registerAccepted: (row as {registerAccepted: number}).registerAccepted === 1,
                }); 
              }
              resolve(retObj);
            }
          });
        }) as ExchangeType[];

        const responseObject: {name:string,value:string}[] = [];

        for (const exchange of exchanges) {
          responseObject.push({
            name: exchange.name,
            value: exchange.id.toString()
          })
        }

        e.respond(responseObject)
      },
    })
  },
  async execute({ event, options, ctx }) {
    // Check for guild
    if (ctx.message === "no_guild" || !event.guild) {
      await event.reply({
        content: "ERROR:\n> This command can only be used in GCC.",
        ephemeral: true,
      });
      return;
    }

    // Check for member
    if (ctx.message === "no_member" || !event.member) {
      await event.reply({
        content: "ERROR:\n> Could not fetch member.",
        ephemeral: true,
      });
      return;
    }
    
    
  },
});