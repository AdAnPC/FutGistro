const colombiaData = {
    "Amazonas": ["Leticia", "Puerto Nariño"],
    "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Apartadó", "Rionegro", "Turbo", "Caucasia"],
    "Arauca": ["Arauca", "Arauquita", "Saravena", "Tame"],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Carmen de Bolívar"],
    "Boyacá": ["Tunja", "Sogamoso", "Duitama", "Chiquinquirá", "Puerto Boyacá"],
    "Caldas": ["Manizales", "La Dorada", "Chinchiná", "Riosucio", "Villamaría"],
    "Caquetá": ["Florencia", "San Vicente del Caguán", "Cartagena del Chairá"],
    "Casanare": ["Yopal", "Aguazul", "Paz de Ariporo", "Villanueva"],
    "Cauca": ["Popayán", "Santander de Quilichao", "El Tambo", "Patía", "Puerto Tejada"],
    "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia"],
    "Chocó": ["Quibdó", "Istmina", "Tadó", "Condoto", "Alto Baudó"],
    "Córdoba": ["Ayapel", "Buenavista", "Canalete", "Cereté", "Chimá", "Chinú", "Ciénaga de Oro", "Cotorra", "La Apartada", "Lorica", "Los Córdobas", "Momil", "Montelíbano", "Montería", "Moñitos", "Planeta Rica", "Pueblo Nuevo", "Puerto Escondido", "Puerto Libertador", "Purísima", "Sahagún", "San Andrés de Sotavento", "San Antero", "San Bernardo del Viento", "San Carlos", "San José de Uré", "San Pelayo", "Tierralta", "Tuchín", "Valencia"],
    "Cundinamarca": ["Bogotá D.C.", "Soacha", "Fusagasugá", "Facatativá", "Zipaquirá", "Chía", "Mosquera"],
    "Guainía": ["Inírida", "Barrancominas"],
    "Guaviare": ["San José del Guaviare", "El Retorno", "Calamar"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "San Juan del Cesar", "Fonseca"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Zona Bananera", "Fundación", "El Banco"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López"],
    "Nariño": ["Pasto", "Tumaco", "Ipiales", "Túquerres", "Sandoná"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Villa del Rosario", "Los Patios", "Pamplona"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Orito", "Valle del Guamuez"],
    "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Circasia", "Montenegro"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Barrancabermeja", "Girón", "Piedecuesta", "San Gil"],
    "Sucre": ["Sincelejo", "Corozal", "San Marcos", "Tolú", "Sampués"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Chaparral", "Líbano"],
    "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá", "Yumbo", "Cartago", "Jamundí", "Buga"],
    "Vaupés": ["Mitú", "Carurú", "Taraira"],
    "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
};

// Función de utilidad para llenar los selects
function poblarDepartamentos(selectDeptoId) {
    const selectDepto = document.getElementById(selectDeptoId);
    if (!selectDepto) return;
    selectDepto.innerHTML = '<option value="">Seleccione Depto...</option>';
    Object.keys(colombiaData).sort().forEach(depto => {
        selectDepto.innerHTML += `<option value="${depto}">${depto}</option>`;
    });
}

function poblarCiudades(deptoElegido, selectCiudadId) {
    const selectCiudad = document.getElementById(selectCiudadId);
    if (!selectCiudad) return;
    
    selectCiudad.innerHTML = '<option value="">Seleccione Ciudad...</option>';
    
    if (deptoElegido && colombiaData[deptoElegido]) {
        colombiaData[deptoElegido].sort().forEach(ciudad => {
            selectCiudad.innerHTML += `<option value="${ciudad}">${ciudad}</option>`;
        });
    }
}
