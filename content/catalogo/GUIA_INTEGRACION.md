# Guía breve de integración — CrH-Anatomy

## Estructura de carpetas
```text
CrH_Anatomy_Catalogo_INS_01_10/
├── catalogo_maestro.json
├── README.md
├── GUIA_INTEGRACION.md
├── instrumentos/
│   ├── ins-01.json
│   └── ... ins-10.json
└── recursos_visuales/
    ├── manifest_recursos_visuales.json
    └── *.svg
```

## Ejemplo JavaScript (carga estática)
```js
async function cargarCatalogo(baseUrl) {
  const response = await fetch(`${baseUrl}/catalogo_maestro.json`);
  if (!response.ok) throw new Error("No se pudo cargar el catálogo");
  const catalogo = await response.json();

  const instrumentos = await Promise.all(
    catalogo.instruments.map(async (item) => {
      const r = await fetch(`${baseUrl}/${item.file}`);
      if (!r.ok) throw new Error(`No se pudo cargar ${item.instrument_id}`);
      return await r.json();
    })
  );

  return instrumentos;
}
```

## Renderizado de recursos visuales
```js
function resolverRecurso(asset, baseUrl) {
  if (!asset.file) return null;
  return `${baseUrl}/recursos_visuales/${asset.file}`;
}
```
Nota: las rutas de los SVG incluidos están expresadas como nombres de archivo. Ajustar `baseUrl` al directorio real de recursos.

## Estados que debe mostrar la interfaz
- `outline`: esquema inicial.
- `content_draft`: contenido redactado pendiente de revisión.
- `reviewed`: solo después de revisión académica documentada.

No convertir automáticamente `pending` en aprobado. No mostrar escalas como “validadas” por el hecho de estar listadas.
