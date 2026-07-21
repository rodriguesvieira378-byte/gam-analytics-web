import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Variável de ambiente obrigatória não encontrada: ${name}`);
  }

  return value;
}

export const config = {
  discord: {
    token: requireEnv("DISCORD_BOT_TOKEN"),
  },

  environment: process.env.NODE_ENV ?? "development",
};