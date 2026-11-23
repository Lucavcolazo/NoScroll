<p align="center">
  <img src="icons/icon128.png" width="96" alt="NoScroll">
</p>

<h1 align="center">NoScroll</h1>

<p align="center">
  Una bolita que vigila tus pestañas y te cierra las que te distraen.<br>
  Instagram, TikTok, X… lo que vos configures.
</p>

---

## ¿Qué hace?

Cuando la activás, la bolita revisa todas tus pestañas abiertas. Si entrás a un sitio prohibido:

1. Aparece rebotando abajo a la derecha y te mira.
2. Mira la ❌ que aparece arriba a la derecha.
3. Se aplasta, salta y **lanza un cursor** que vuela hasta la ❌ y hace click.
4. Te dice "Chau 👋" y **cierra la pestaña**.

Desde el popup podés:

- Activarla y desactivarla.
- Agregar o sacar sitios de la lista.
- Ver cuántas pestañas te cerró.

## Instalación

Funciona en **Brave, Chrome, Edge, Arc y Opera** (cualquier navegador basado en Chromium). Por ahora no funciona en Safari ni Firefox.

1. **Descargá la extensión**
   - Opción fácil: en esta página tocá el botón verde **Code → Download ZIP** y descomprimí el archivo.
   - Con git:
     ```bash
     git clone https://github.com/Lucavcolazo/NoScroll.git
     ```

2. **Abrí la página de extensiones** de tu navegador:

   | Navegador | Dirección |
   |-----------|-----------|
   | Brave     | `brave://extensions` |
   | Chrome    | `chrome://extensions` |
   | Edge      | `edge://extensions` |
   | Arc       | `arc://extensions` |

3. Activá el **Modo de desarrollador** (arriba a la derecha).

4. Tocá **Cargar descomprimida** y elegí la carpeta `NoScroll`, la que tiene adentro el archivo `manifest.json`.

5. Fijá la bolita en la barra: tocá el ícono del rompecabezas 🧩 y después el pin 📌 al lado de NoScroll.

> Al instalarla, el navegador avisa que la extensión puede "leer y cambiar datos en todos los sitios". Lo necesita para mostrar la bolita encima de la página. **No recolecta ni envía ningún dato**: todo queda guardado en tu navegador.

## Uso

1. Tocá la bolita en la barra del navegador.
2. Tocá **Activar**. Se despierta y cierra al instante las pestañas prohibidas que tengas abiertas.
3. Para agregar un sitio, escribilo en el campo y tocá **Agregar**:
   - `youtube.com` bloquea ese dominio y sus subdominios (como `m.youtube.com`).
   - `tiktok`, sin el `.com`, bloquea cualquier dominio que contenga esa palabra.
4. Para sacar un sitio, tocá la **×** al lado.

Por defecto vienen bloqueados: `instagram.com`, `tiktok.com`, `x.com`, `twitter.com`, `facebook.com` y `reddit.com`.

## Actualizar

Como no está en la Chrome Web Store, no se actualiza sola. Para tener la última versión:

1. Bajá el ZIP de nuevo, o hacé `git pull` si la clonaste.
2. En la página de extensiones, tocá el botón de recargar ↻ de NoScroll.

## Estructura

```
NoScroll/
├── manifest.json   # Configuración de la extensión (Manifest V3)
├── background.js   # Vigila las pestañas, anima la bolita y cierra la pestaña
├── popup.html      # Popup de la barra
├── popup.css
├── popup.js
└── icons/          # Íconos 16/32/48/128 px
```

## Personalizar

- **Tiempos de la animación**: la constante `T` dentro de `guardianAttack` en `background.js`.
- **Cuánto espera antes de cerrar**: `POUNCE_DELAY_MS` en `background.js`.
- **Frases de la bolita**: el array `phrases` dentro de `guardianAttack`.

Después de cambiar algo, recargá la extensión con ↻.
