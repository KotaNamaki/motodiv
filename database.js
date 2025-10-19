const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
require('dotenv').config();

const sshConfig = {
    host: process.env.SSH_HOST,
    user: process.env.SSH_USERNAME,
    port: process.env.SSH_PORT || 64000,
    password: process.env.SSH_PASSWORD,
};

const dbConfig = {
    host: '127.0.0.1',
    user : process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const sshClient = new Client();
let pool;

const getDBPool = async () => {
    if(pool){
        return pool;
    }
    return new Promise((resolve, reject) => {
        sshClient.on('ready', async () => {
            console.log('SSH Tunnel Established');
            sshClient.forwardOut(
                '127.0.0.1',
                0,
                dbConfig.host,
                process.env.DB_PORT || 3306,
                (err, stream) => {
                    if (err) {
                        console.log('Error in SSH forwardOut: ',err);
                        return reject(err);
                    }
                    console.log('Port Forwarding active, connecting to MysqlDB')

                    pool = mysql.createPool({
                        ...dbConfig,
                        stream : stream,
                        waitForConnections: true,
                        connectionLimit:10,
                        queueLimit: 10,
                    });

                    console.log('MySql connection pool established');
                    resolve(pool);
                }
            );
        }).on('error', err => {
            console.error('SSH Client Error: ', err);
            reject(err);
        }).connect(sshConfig);
    });
};

module.exports = { getDBPool };

