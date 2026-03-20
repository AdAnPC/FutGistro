require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, Usuario, Categoria, Escuela } = require('../models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // ¡Cuidado! Force: true borra todo y recrea las tablas
        await sequelize.sync({ force: true });
        console.log('✅ Tablas recreadas desde cero');

        // 1. Crear al menos una escuela por defecto (necesario para el sistema)
        const escuela = await Escuela.create({
            nombre: 'Escuela Principal FutGistro',
            direccion: 'Sede Principal',
            telefono: '0000000',
            director: 'Administrador',
            email: 'contacto@escuela.com',
            activa: true
        });
        console.log('✅ Escuela base creada');

        // 2. Generar contraseña ultra segura (puedes cambiarla después en el perfil)
        const passwordPlana = 'FG-SuperAdmin_2026_!#@_SecureAccess_99'; // Contraseña fuerte
        const salt = await bcrypt.genSalt(12); // Más vueltas de hashing para más seguridad
        const securePassword = await bcrypt.hash(passwordPlana, salt);

        // 3. Crear ÚNICO Super Administrador
        await Usuario.create({
            nombre: 'Super Administrador',
            email: 'superadmin@futgistro.com',
            password: securePassword,
            rol: 'superadmin',
            escuela_id: null // Un superadmin no está restringido a una escuela
        });
        console.log('✅ Super Administrador creado con éxito');

        // 4. Categorías base (útiles para empezar)
        await Categoria.bulkCreate([
            { nombre: 'Iniciación', edad_min: 4, edad_max: 6 },
            { nombre: 'Sub 10', edad_min: 7, edad_max: 10 },
            { nombre: 'Sub 15', edad_min: 11, edad_max: 15 }
        ]);
        console.log('✅ Categorías base creadas');

        console.log('\n═══════════════════════════════════════════════════');
        console.log('  🎉 SEED COMPLETADO CON ÉXITO');
        console.log('═══════════════════════════════════════════════════');
        console.log('\n  ACCESO ÚNICO:');
        console.log('  📧 Email:    superadmin@futgistro.com');
        console.log('  🔑 Password: ' + passwordPlana);
        console.log('\n  ⚠️  ¡Guarda esta contraseña y borra el archivo seed o limpia los logs!');
        console.log('═══════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal en el proceso de seed:', error);
        process.exit(1);
    }
}

seed();
