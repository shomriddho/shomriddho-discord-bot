import { env } from "@shomriddho-discord-bot/env/server";
import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
];

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

export async function initBot() {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on(Events.ClientReady, (readyClient: any) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
  });

  client.on(Events.InteractionCreate, async (interaction: any) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
      await interaction.reply("Pong!");
    }
  });

  client.login(env.DISCORD_TOKEN);
}
