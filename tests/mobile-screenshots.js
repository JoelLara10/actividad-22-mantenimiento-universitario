const { chromium } = require('playwright');
const path = require('path');

const baseURL = process.env.BASE_URL || 'https://mantenimiento-u-actividad22.onrender.com';
const out = process.env.OUT_DIR || '/workspace/shared';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36'
  });
  const page = await context.newPage();
  const shot = name => page.screenshot({ path: path.join(out, name), fullPage: false });
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 45000 });
  await shot('01-inicio-sesion.png');
  await page.getByLabel('Correo institucional', { exact: true }).fill('estudiante@universidad.mx');
  await page.getByRole('textbox', { name: /Contraseña/ }).fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar de forma segura' }).click();
  await page.getByRole('heading', { name: /Hola, Joel/ }).waitFor();
  await shot('02-panel-principal.png');
  await page.getByRole('button', { name: /Crear nuevo reporte/ }).click();
  await page.getByLabel('Categoría').selectOption({ label: 'Iluminación' });
  await page.getByLabel('Prioridad').selectOption({ label: 'Alta' });
  await page.getByLabel('Edificio').selectOption({ label: 'Laboratorios' });
  await page.getByLabel('Aula o área').fill('Laboratorio 3');
  await page.getByLabel('Título').fill('Luminaria parpadea constantemente');
  await page.getByRole('textbox', { name: /Descripción/ }).fill('La luminaria central parpadea y dificulta las actividades. Se solicita revisión eléctrica.');
  await shot('03-registro-reporte.png');
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await page.getByText(/Reporte MAN-2026-/).waitFor();
  await shot('04-reporte-registrado.png');
  await page.getByRole('button', { name: /Reportes/ }).last().click();
  await page.getByRole('heading', { name: 'Mis reportes' }).waitFor();
  await shot('05-consulta-reportes.png');
  await page.getByRole('button', { name: /Perfil/ }).last().click();
  await page.getByRole('heading', { name: 'Mi perfil' }).waitFor();
  await shot('06-perfil-seguro.png');
  await browser.close();
  console.log('Capturas móviles generadas');
})().catch(err => { console.error(err); process.exit(1); });
