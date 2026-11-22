# CrH-Anatomy — Catálogo INS-01 a INS-10

## Contenido
- `catalogo_maestro.json`: índice central de los diez instrumentos.
- `instrumentos/ins-XX.json`: ficha estructurada individual por instrumento.
- `recursos_visuales/`: diagramas SVG originales y manifiesto de recursos.
- `GUIA_INTEGRACION.md`: indicaciones para el programador.

## Integración sugerida
1. Copiar la carpeta completa al directorio de contenidos de CrH-Anatomy.
2. Leer `catalogo_maestro.json`.
3. Cargar cada ficha indicada en `instruments[].file`.
4. Renderizar campos como listas o secciones según el diseño de la app.
5. Mostrar `review_status` y `content_notice` en la interfaz administrativa o ficha del instrumento.
6. Resolver las rutas de `visual_assets[].file` relativas a la carpeta del paquete. Si `file` es `null`, no mostrar imagen local; mantener el recurso como pendiente.
7. No mostrar formularios oficiales ni copiar escalas completas hasta verificar permisos y versión autorizada.

## Contrato de datos
Todos los instrumentos comparten:
`instrument_id`, `title`, `category`, `related_specialties`, `target_population`, `purpose`, `variables`, `tools`, `protocols`, `scales`, `visual_assets`, `record_fields`, `safety`, `activities`, `references`, `licensing`, `review_status`, `version`, `language`, `content_notice`.

- `review_status`: por ahora `content_draft`.
- `licensing.source_verification`: por ahora `pending`.
- Los recursos SVG incluidos son diagramas educativos originales, no reproducciones de escalas oficiales.
- Los elementos gráficos pendientes están descritos en `recursos_visuales/manifest_recursos_visuales.json`.

## Alcance y limitaciones académicas
Este paquete constituye una primera entrega técnica y editorial. No equivale a validación académica, clínica, psicométrica ni legal. Las referencias bibliográficas contienen datos abreviados y requieren completar/verificar título, edición, revista, volumen, páginas, DOI o URL institucional antes de publicación. Los procedimientos deben contrastarse con fuentes primarias, manuales oficiales y protocolos locales.

## Recomendaciones técnicas
- Validar JSON con `JSON.parse()` durante carga.
- No codificar puntuaciones o puntos de corte como universales si dependen de edad, población, versión o contexto.
- Separar contenido informativo de formularios de registro del paciente.
- Para datos clínicos reales, implementar control de acceso, consentimiento, minimización de datos, almacenamiento seguro y política de retención; no almacenar datos identificables en localStorage sin evaluación de seguridad.
- La aplicación educativa no sustituye supervisión clínica ni protocolos institucionales.
