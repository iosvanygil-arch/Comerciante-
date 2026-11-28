import { readFile } from 'node:fs/promises';

const path = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(path, 'utf8');
if (!xml.includes('android.permission.CAMERA')) {
  const application = xml.indexOf('<application');
  if (application < 0) throw new Error('No se encontró el elemento <application> en AndroidManifest.xml');
  xml = xml.slice(0, application) +
    '    <uses-permission android:name="android.permission.CAMERA" />\\n' +
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\\n' +
    xml.slice(application);
  await (await import('node:fs/promises')).writeFile(path, xml);
}
console.log('Permiso CAMERA configurado en AndroidManifest.xml');
