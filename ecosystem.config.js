module.exports = {
    apps: [
        {
            name: "lms-server",
            script: "index.js",
            cwd: "./server",
            watch: ["index.js", "controllers", "routes", "models", "services"],
            ignore_watch: ["node_modules", "logs"],
            env: {
                NODE_ENV: "production",
                NODE_SKIP_PLATFORM_CHECK: "1"
            },
            env_development: {
                NODE_ENV: "development",
                NODE_SKIP_PLATFORM_CHECK: "1"
            }
        },
        {
            name: "lms-admin",
            script: "cmd.exe",
            args: ["/c", "npm run dev"],
            cwd: "./admin",
            env: {
                NODE_ENV: "production",
                NODE_SKIP_PLATFORM_CHECK: "1"
            },
            env_development: {
                NODE_ENV: "development",
                NODE_SKIP_PLATFORM_CHECK: "1"
            }
        }
    ]
};
