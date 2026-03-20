const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || process.env.MYSQL_DATABASE || 'railway',
  process.env.DB_USER || process.env.MYSQLUSER || 'root',
  process.env.DB_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQLPASSWORD || '',
  {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

module.exports = sequelize;
