const fs = require('fs');
const path = require('path');

const privateKey = "-----BEGIN PRIVATE KEY-----\n" +
"MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDmC83n6aXLt0Gl\n" +
"LhCGcfq1rP+MLYtxkFXPkIt/khgluT6YRg/x/tXfvYqD2gDLZln4OuwLg3BQr059\n" +
"XpE4l7LJO5mtnYyJn8P5KVXoHkrdUyI1AHaRI4bTntAkFf+UvcCyh9tAw+Ap1sn7\n" +
"TlRQiUMLiBFJ8F5ji8/zANzbDEOdlLpGJ1TRj8A5rTGUpsDAdveE88ngIh7YtFAM\n" +
"CDZCbY/PvdlYnXx5FoVPKc4eJ9JwuWxeNim6BkJvN34oscfjPytDOVoW+tfcoHcO\n" +
"X3y8G/kL7m2VzSjWlszfLz4QdtgJ5iOQstrFL3J6vzK/vvZQKISmLQOd59Kbufzr\n" +
"FO6qY1dhAgMBAAECggEAArWjUjC8qVYgMqfExb8dXj7+a2xYx+ScuKErzfPSp0zX\n" +
"yo2Kc/nR00DXWxlF9K9Y5l88CxCMOdSPQ7NxuZ9SiZuLQk3khyVRvq9Cm+1RqZrA\n" +
"WJxH0TrATIE6k467ZfEwVh/61HfsJbUCF/TQshpERww2MysmwvSVVWf6afVyfU5a\n" +
"tfTixKjwQKNK/xMAKMQxYUJQNvjitMQatzd6IToDgjFofsIFI+sJdxMWUT5l4Q03\n" +
"/4AJ7lv9ezPhn8VTaDjHx+h1xcN1kS1CTN9coDWVrbeYobk2/Bnm6KBdca+sxKeS\n" +
"A2VbBdmQYXEPh7Yp9TbcKrQccBlvKjxY9xHkV/uUgQKBgQDzwy+/vw+sxcR2o1Z/\n" +
"mRA+R4U11FwE6G4njUKJzYL0QR+i8TeUr1vG+si0lve38GTnox3qf4ycOyDVGi/9\n" +
"3fmT8HzdJfcWOehy4h8IcRT9vRcglxnR2V7W65SFSwNty0+XOyrrdwtry2+0TcjL\n" +
"aruMmu4Vlre1lv3ggfGaXxAZgQKBgQDxmFYutouBYO2RMFkZtqOASQb9KogotXBF\n" +
"4nDIF41DsgyEDsf+F0vzOKi60PBdrSnKyoZYZ7gfyqZXa9HlMycusDuFdYN0e5HV\n" +
"LjgPXbSyrlDeQ5lkVjW//MdrOLiBgYUsolnFA62SlgAgMsfgtb/rg3gCTX95ysPb\n" +
"2ZUc2OFt4QKBgQCU3idTGwQfp8gMDETPOFNLNbKM5VwtQyXC0epI7lGDiiIgCODA\n" +
"1TdfldjtMSWoGBAHxv6GL89XumSawJt+lwnM55naFU2JLWRghOge57DCJbDyHlWO\n" +
"awoYh1b08JLvgrLg0SmtE87NzjgyDS8Ly+suO5AbbyhSphv1+GXsuRHEAQKBgCef\n" +
"ECNBFMf3GX8CKtqotU/IqjjCzOnAN9V+OXjXQ/eiL6NIuUvWjkIpPKLGuWTjjUMQ\n" +
"y8+b0vqDxZv4tsecCAUEKf7NMu3bhiMsHU2H1KapJ+ILvBBUgyQlVJ8lAj1a/HhB\n" +
"d+9zlve/We3t5hHYPM1nFjtqckmLE2vu1yGQAAiBAoGBAOMD2bMT4xnwIjehXlCi\n" +
"Di/oG/EroZ6zcB3cSBDoHPB5mEv9RUNSeY+j9Os/46KR29KvSBjsFczKljn6K6C4\n" +
"TNBIV3Nk+0uEBshzzWcZRhluH+SEcFMSzO7l2wmwg0qWxL/bULh35oQrHeR2KQpk\n" +
"RnkNLOaZu2gnt6j+W0agY2tt\n" +
"-----END PRIVATE KEY-----\n";

const keyData = {
  "type": "service_account",
  "project_id": "fonda-478119",
  "private_key_id": "3ecff0b5404093e78683f11b224cf3ecc7c5a434",
  "private_key": privateKey.replace(/\n/g, '\\n'), // Convertimos saltos reales a literales para JSON
  "client_email": "futgistro@fonda-478119.iam.gserviceaccount.com",
  "client_id": "116313589090203807777",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/futgistro%40fonda-478119.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Escribimos como JSON válido
fs.writeFileSync(path.join(__dirname, '../config/google-service-account.json'), JSON.stringify(keyData, null, 2));
console.log('✅ JSON reconstruido con éxito.');
