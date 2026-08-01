import "dotenv/config"

export const config = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL
}