module.exports = {
    apps: [{
        name: 'psn-welfare-backend',
        script: './src/index.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
        },
        env_production: {
            NODE_ENV: 'production',
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true,
        max_memory_restart: '1G',
        watch: false,
        merge_logs: true,
        instance_var: 'INSTANCE_ID',
        listen_timeout: 5000,
        kill_timeout: 5000
    }]
};