const isWin = process.platform === "win32";

module.exports = {
    apps: [
        {
            name: "lms-server",
            script: "index.js",
            cwd: "./server",
            watch: ["index.js", "controllers", "routes", "models", "services"],
            ignore_watch: ["node_modules", "logs"],
            env: {
                NODE_ENV: "development",
                NODE_SKIP_PLATFORM_CHECK: "1"
            },
            env_production: {
                NODE_ENV: "production",
                NODE_SKIP_PLATFORM_CHECK: "1"
            }
        },
        {
            name: "lms-admin",
            script: isWin ? "cmd.exe" : "npm",
            args: isWin ? ["/c", "npm run dev"] : "run dev",
            cwd: "./admin",
            env: {
                NODE_ENV: "development",
                NODE_SKIP_PLATFORM_CHECK: "1"
            },
            env_production: {
                NODE_ENV: "production",
                NODE_SKIP_PLATFORM_CHECK: "1"
            }
        }
    ]
};
