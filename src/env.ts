export type NodeEnvType = "development" | "production"

export const env = {
    PORT: process.env.PORT ? +process.env.PORT : 8080,
    HOST: process.env.HOST ?? "0.0.0.0",
    NODE_ENV: process.env.NODE_ENV === "development" ? "development" : "production" as NodeEnvType,
    MAX_ROOMS: process.env.MAX_ROOMS ? +process.env.MAX_ROOMS : 20,
    ADMIN: {
        USERNAME: process.env.ADMIN_USERNAME ?? "admin",
        PASSWORD: process.env.ADMIN_PASSWORD ?? "admin",
    }
}