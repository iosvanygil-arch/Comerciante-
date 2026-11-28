import { readFile, writeFile } from 'node:fs/promises';

const path = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(path, 'utf8');
if (!xml.includes('android.permission.CAMERA')) {
  const application = xml.indexOf('<application');
  if (application < 0) throw new Error('No se encontró el elemento <application> en AndroidManifest.xml');
  const newline = String.fromCharCode(10);
  xml = xml.slice(0, application) +
    '    <uses-permission android:name="android.permission.CAMERA" />' + newline +
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />' + newline +
    xml.slice(application);
  await writeFile(path, xml);
}
console.log('Permiso CAMERA configurado en AndroidManifest.xml');
