// Script para probar las credenciales de Zoho CRM
require('dotenv').config();
const axios = require('axios');

async function testZohoCredentials() {
  console.log('🔍 Testing Zoho CRM credentials...\n');

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  // Verificar que existan las variables
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Error: Faltan variables de entorno');
    console.log('ZOHO_CLIENT_ID:', clientId ? '✓ Configurado' : '✗ Falta');
    console.log('ZOHO_CLIENT_SECRET:', clientSecret ? '✓ Configurado' : '✗ Falta');
    console.log('ZOHO_REFRESH_TOKEN:', refreshToken ? '✓ Configurado' : '✗ Falta');
    process.exit(1);
  }

  console.log('✓ Variables de entorno encontradas');
  console.log('Client ID:', clientId.substring(0, 20) + '...');
  console.log('Client Secret:', clientSecret.substring(0, 10) + '...');
  console.log('Refresh Token:', refreshToken.substring(0, 20) + '...\n');

  // Intentar refrescar el token
  try {
    console.log('🔄 Intentando refrescar access token...');

    const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ Access token obtenido exitosamente!\n');
    console.log('Access Token:', response.data.access_token.substring(0, 30) + '...');
    console.log('Expira en:', response.data.expires_in, 'segundos');
    console.log('API Domain:', response.data.api_domain);
    console.log('Token Type:', response.data.token_type);

    // Intentar hacer una petición de prueba
    console.log('\n🧪 Probando petición a Zoho CRM API...');
    const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
    const testUrl = `${apiDomain}/crm/v2/Contacts?per_page=1`;

    const crmResponse = await axios.get(testUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${response.data.access_token}`,
      },
    });

    console.log('✅ Conexión exitosa a Zoho CRM API!');
    console.log('Contactos encontrados:', crmResponse.data.data ? crmResponse.data.data.length : 0);

    if (crmResponse.data.data && crmResponse.data.data.length > 0) {
      const contact = crmResponse.data.data[0];
      console.log('\nEjemplo de contacto:');
      console.log('  ID:', contact.id);
      console.log('  Nombre:', contact.Full_Name || contact.First_Name);
      console.log('  Email:', contact.Email);

      // Verificar si existe el campo Estado_del_cliente
      if ('Estado_del_cliente' in contact) {
        console.log('  ✅ Campo "Estado_del_cliente" existe:', contact.Estado_del_cliente);
      } else {
        console.log('  ⚠️  Campo "Estado_del_cliente" NO encontrado en este contacto');
        console.log('  Campos disponibles:', Object.keys(contact).filter(k => k.includes('Estado')));
      }
    }

    console.log('\n✅ ¡Todo funciona correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Verifica que el campo "Estado_del_cliente" existe en Zoho CRM');
    console.log('2. Asegúrate de que el refresh token no haya sido revocado');
    console.log('3. Reinicia el backend: npm run start:dev');

  } catch (error) {
    console.error('\n❌ Error al obtener access token:');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.data.error === 'invalid_client') {
        console.error('\n💡 Posible solución:');
        console.error('   - Client ID o Client Secret incorrectos');
        console.error('   - Verifica las credenciales en Zoho API Console');
      } else if (error.response.data.error === 'invalid_grant') {
        console.error('\n💡 Posible solución:');
        console.error('   - El refresh token es inválido o ha expirado');
        console.error('   - Necesitas generar un nuevo refresh token');
        console.error('   - Sigue el paso 2 de ZOHO_SETUP.md');
      }
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

testZohoCredentials()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error.message);
    process.exit(1);
  });
