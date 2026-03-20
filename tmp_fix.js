const fs = require('fs');
let txt = fs.readFileSync('views/jugadores/formulario.html', 'utf8');

const replacements = [
  { id: 'nombre', reg: "/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\\\s]/g" },
  { id: 'lugar_nacimiento', reg: "/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\\\s,]/g" },
  { id: 'eps', reg: "/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\\\\s]/g" },
  { id: 'estatura', reg: "/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\\\\.\\\\s]/g" },
  { id: 'peso', reg: "/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\\\\.\\\\s]/g" },
  { id: 'ciudad', reg: "/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\\\s,]/g" },
  { id: 'direccion', reg: "/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\\\\s\\\\.,#-]/g" },
  { id: 'nombre_padre', reg: "/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\\\s]/g" },
  { id: 'nombre_madre', reg: "/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\\\\s]/g" },
];

for (let r of replacements) {
    const rx = new RegExp(`id="${r.id}"[\\s\\S]*?oninput="[^"]*"`);
    txt = txt.replace(rx, function(match){
        return match.replace(/oninput="[^"]*"/, `oninput="let v=this.value.replace(${r.reg}, ''); if(this.value!==v)this.value=v;"`);
    });
}

// Fix numbers
const numbers = ['documento', 'numero_fijo', 'telefono', 'cc_padre', 'cc_madre', 'telefono_padre'];
for (let id of numbers) {
    const rx = new RegExp(`id="${id}"[\\s\\S]*?oninput="[^"]*"`);
    txt = txt.replace(rx, function(match){
        return match.replace(/oninput="[^"]*"/, `oninput="let v=this.value.replace(/[^0-9]/g, ''); if(this.value!==v)this.value=v;"`);
    });
}

// Fix tipo_sangre
const rx = new RegExp(`id="tipo_sangre"[\\s\\S]*?oninput="[^"]*"`);
txt = txt.replace(rx, function(match){
    return match.replace(/oninput="[^"]*"/, `oninput="let v=this.value.replace(/[^a-zA-Z0-9\\\\+\\\\-]/g, ''); if(this.value!==v)this.value=v;"`);
});

// Also fix the corrupted "automáticamente"
txt = txt.replace('automÃ¡ticamente', 'automáticamente');

fs.writeFileSync('views/jugadores/formulario.html', txt, 'utf8');
