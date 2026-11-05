const http = require('http');
const querystring = require('querystring');
const { Buffer } = require('node:buffer');

const HOST = '0.0.0.0';
const PORT = Number(process.env.RESET_WEB_PORT || 8081);
const API_HOST = process.env.API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.API_PORT || 8080);

function page({ token = '', message = '', error = '' } = {}) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Restablecer contraseña - Guardian Escolar</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0b1117;
      color: #f7fafc;
      font-family: Arial, sans-serif;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #2d3748;
      border-radius: 8px;
      padding: 28px;
      background: #151c25;
    }
    h1 {
      margin: 0 0 8px;
      color: #74b4ff;
      font-size: 28px;
      text-align: center;
    }
    p {
      color: #cbd5e0;
      text-align: center;
    }
    label {
      display: block;
      margin: 18px 0 8px;
      font-weight: 700;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #39445f;
      background: #242844;
      color: #fff;
      font-size: 16px;
    }
    button {
      width: 100%;
      margin-top: 22px;
      border: 0;
      border-radius: 8px;
      padding: 15px;
      background: #74b4ff;
      color: #08101a;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
    }
    .ok, .err {
      margin-top: 18px;
      padding: 12px;
      border-radius: 8px;
      font-weight: 700;
    }
    .ok {
      color: #98f5b6;
      background: #12331e;
      border: 1px solid #2f8f4e;
    }
    .err {
      color: #ff9b9b;
      background: #3b1618;
      border: 1px solid #d65d63;
    }
  </style>
</head>
<body>
  <main>
    <h1>Restablecer contraseña</h1>
    <p>Escribe tu nueva contraseña para Guardian Escolar.</p>
    <form method="post" action="/reset-password">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <label for="password">Nueva contraseña</label>
      <input id="password" name="password" type="password" minlength="8" required autocomplete="new-password" />
      <button type="submit">Guardar contraseña</button>
    </form>
    ${message ? `<div class="ok">${escapeHtml(message)}</div>` : ''}
    ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) request.destroy();
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function resetPassword(token, newPassword) {
  const payload = JSON.stringify({ token, newPassword });

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: '/api/auth/password/reset',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          const data = body ? JSON.parse(body) : {};
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data.mensaje || 'Contrasena actualizada.');
            return;
          }
          reject(new Error(data.mensaje || data.message || 'No se pudo restablecer la contraseña.'));
        });
      }
    );

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/reset-password') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page({ token: url.searchParams.get('token') || '' }));
    return;
  }

  if (request.method === 'POST' && url.pathname === '/reset-password') {
    const body = querystring.parse(await readBody(request));
    try {
      const message = await resetPassword(body.token || '', body.password || '');
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(page({ message }));
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(page({ token: body.token || '', error: error.message }));
    }
    return;
  }

  response.writeHead(302, { Location: '/reset-password' });
  response.end();
});

server.listen(PORT, HOST, () => {
  console.log(`Password reset page listening on http://${HOST}:${PORT}`);
  console.log(`Posting password reset requests to http://${API_HOST}:${API_PORT}`);
});
