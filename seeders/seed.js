require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, Usuario, Categoria, Escuela } = require('../models');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        await sequelize.sync({ force: true });
        console.log('✅ Tablas recreadas');

        // Create schools first
        const escuelas = await Escuela.bulkCreate([
            {
                nombre: 'Escuela Principal',
                direccion: 'Calle Principal #123',
                telefono: '3001234567',
                director: 'Director Principal',
                email: 'contacto@escuelaprincipal.com',
                activa: true
            },
            {
                nombre: 'Escuela Norte',
                direccion: 'Avenida Norte #456',
                telefono: '3009876543',
                director: 'Director Norte',
                email: 'contacto@escuelanorte.com',
                activa: true
            }
        ]);
        console.log('✅ Escuelas creadas');

        // Create passwords
        const salt = await bcrypt.genSalt(10);
        const superPassword = await bcrypt.hash('super123', salt);
        const adminPassword = await bcrypt.hash('admin123', salt);
        const entrenadorPassword = await bcrypt.hash('coach123', salt);

        // Create users with escuela_id
        await Usuario.bulkCreate([
            {
                nombre: 'Super Administrador',
                email: 'superadmin@escuela.com',
                password: superPassword,
                rol: 'superadmin',
                escuela_id: null // Superadmin ve todas las escuelas
            },
            {
                nombre: 'Admin Escuela Principal',
                email: 'admin@escuela.com',
                password: adminPassword,
                rol: 'administrador',
                escuela_id: escuelas[0].id // Solo ve Escuela Principal
            },
            {
                nombre: 'Entrenador Principal',
                email: 'entrenador@escuela.com',
                password: entrenadorPassword,
                rol: 'entrenador',
                escuela_id: escuelas[0].id // Solo ve Escuela Principal
            },
            {
                nombre: 'Entrenador Norte',
                email: 'entrenador.norte@escuela.com',
                password: entrenadorPassword,
                rol: 'entrenador',
                escuela_id: escuelas[1].id // Solo ve Escuela Norte
            }
        ]);
        console.log('✅ Usuarios creados');

        // Create categories
        await Categoria.bulkCreate([
            { nombre: 'Sub 6', edad_min: 4, edad_max: 6 },
            { nombre: 'Sub 8', edad_min: 6, edad_max: 8 },
            { nombre: 'Sub 10', edad_min: 8, edad_max: 10 },
            { nombre: 'Sub 12', edad_min: 10, edad_max: 12 },
            { nombre: 'Sub 15', edad_min: 12, edad_max: 15 }
        ]);
        console.log('✅ Categorías creadas');

        console.log('\n🎉 Seed completado exitosamente!');
        console.log('\n📧 Usuarios de prueba:');
        console.log('   🔑 Super Admin:  superadmin@escuela.com / super123  (ve TODAS las escuelas)');
        console.log('   👔 Admin:        admin@escuela.com / admin123       (solo Escuela Principal)');
        console.log('   ⚽ Entrenador:   entrenador@escuela.com / coach123  (solo Escuela Principal)');
        console.log('   ⚽ Entrenador N: entrenador.norte@escuela.com / coach123  (solo Escuela Norte)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();
