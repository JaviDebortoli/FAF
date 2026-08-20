# PRD - Proyecto "Marco Argumentativo Financiero"

---

## Desvíos aprobados respecto a este PRD (change `faf-platform`, ver `openspec/changes/faf-platform/proposal.md`)

| # | Este PRD dice | Se implementa así | Motivo |
|---|---|---|---|
| D1 | Frontend: Angular | Next.js + React, una sola app | Simplicidad de despliegue para timeline de tesis en solitario |
| D2 | n8n envía webhooks "en formato RDF" | n8n solo dispara y trae datos crudos; la RDF-ificación (Capa 1) se hace en TypeScript | Mantener el código académicamente crítico bajo TDD estricto |
| D3 | Feature de IA (narrativa LLM) y grafo argumentativo visual son parte del sistema | Diferidos a v2 — v1 entrega decisión + traza completa en JSON/tabla | Son solo presentación sobre un núcleo de razonamiento que no cambia; la narrativa LLM es no determinística |
| D4 | Activo no especificado (ejemplos con AAPL) | Activos cripto vía Binance (público, sin API key) | RSI/MACD/SMA/Bollinger y R1-R8 son agnósticos al activo; solo cambia el ejemplo narrativo, no la fidelidad formal |
| D5 | Ventana de MACD = 26 velas (Cuadro 1) | Ventana RSP-QL de MACD = 50 velas (los períodos propios del indicador, 12/26/9, no cambian) | Con omega=26 literal, la serie EMA(26) degenera a un único punto (EMA necesita `período` valores solo para sembrarse, sin quedar ninguno para el paso recursivo), por lo que histogram y sigma_H son siempre 0 y el indicador queda permanentemente inactivo; 50 iguala el tamaño de ventana ya usado uniformemente por el sistema (fetch de 50 velas por ciclo, requerido igualmente por la ventana de 50 de SMA en el propio Cuadro 1) |
| D6 | Ventana de RSI = 14 velas (Cuadro 1) | Ventana RSP-QL de RSI ampliada a 20 velas (el período propio del indicador, 14, no cambia — se pasa explícito a `computeRSI`) | Con `closes.length=14` literal, el bucle de continuación recursiva de Wilder nunca corre (`13 < 13` es falso), por lo que el sistema emitía siempre el promedio simple del paso de siembra, no el suavizado recursivo genuino de Wilder (1978) que el propio módulo cita. Se eligió 20 (no 50, igual que MACD/SMA) deliberadamente: si RSI compartiera ventana con MACD y SMA, las tres tendrían el mismo ρ, anulando estructuralmente el componente de riesgo del operador ⊖ en cualquier ciclo real donde RSI/MACD choquen con SMA. 20 alcanza para que la recursión real converja (6 pasos) sin colisionar con ninguna otra ventana existente |
| D7 | Feature de IA (narrativa LLM) y grafo argumentativo visual son parte del sistema (ver D3): ambos diferidos a v2, v1 entrega decisión + traza completa en JSON/tabla | Ambos admitidos, pero exclusivamente dentro del drill-down por activo (Tier 2); el overview (Tier 1) permanece 100% determinista, sin texto LLM ni grafo — D3 sigue vigente en todo lo demás | La UI v1 sin estilos es indefendible como artefacto de tesis, y la explicabilidad es la afirmación central de esta tesis: un framework que calcula una explicación pero no puede mostrarla se contradice a sí mismo ante el comité. La justificación de costo original de D3 ya no aplica al grafo: `Decision.trace.evidences` + la tabla estática `RULES` ya contienen toda la topología, por lo que el grafo es una función pura de datos que v1 ya produce; solo la narrativa agrega una dependencia genuinamente nueva, y queda confinada detrás de un click explícito del usuario. Límite explícito, cada cláusula verificable independientemente: (1) Tier 1 no renderiza texto LLM ni grafo; (2) ningún valor σ/λ/⟨γ,ρ⟩/gap/Recommendation es derivado por el LLM — el modelo solo puede restatear hechos ya calculados; (3) la narrativa se genera de forma perezosa al abrir el drill-down, nunca precargada; (4) la ausencia de narrativa nunca cambia una decisión: `GET /api/decisions` es byte-idéntico con y sin `ANTHROPIC_API_KEY`; (5) la narrativa está siempre etiquetada visible y permanentemente como generada por IA, tipográficamente distinta de los valores σ/λ deterministas; (6) `src/{rdf,stream,laf,decision,cycle}/` permanecen sin modificar, `src/narrative/` es solo de presentación y no es importado por ningún módulo L1–L4 |

---

## Objetivo
Desarrollar un sistema de soporte a la toma de decisión financiero basado en el Marco Argumentativo Financiero. El sistema debe transformar flujos de datos de mercado en tiempo real en recomendaciones de inversión explicables y trazables, resolviendo conflictos entre indicadores técnicos mediante un motor de Argumentación Etiquetada (LAF).

## Arquitectura del Sistema
   
El software sigue una arquitectura de cuatro capas orientada al flujo de datos continuo (Stream Reasoning):
- Capa 1 - Ingesta Semántica (n8n): Orquestación de datos OHLCV e indicadores técnicos. Se enviarán periodicamente mediante webhooks en formato RDF. 
- Capa 2 - Procesamiento de Flujos (RSP): Evaluación de condiciones mediante ventanas deslizantes W(S, ω, β). Implementación de lógica para RSI, MACD, SMA y Bandas de Bollinger. 
- Capa 3 - Motor de Razonamiento (LAF): Núcleo lógico que gestiona el grafo argumentativo dinámico. Ya cuenta con una implementacion en Java Spring en: https://github.com/JaviDebortoli/LAF
- Capa 4 - Decisión e Interfaz (Angular + AI): Dashboard interactivo que muestra el "score" de las tesis y una narrativa de explicabilidad generada por un LLM. (ver desvíos D1 y D3 arriba — frontend es Next.js/React, no Angular, y la narrativa LLM está diferida a v2)

## Especificaciones Técnicas y Reglas de Negocio

### Definición de Etiquetas (λ)
Cada evidencia llegará etiquetada con un vector bidimensional ⟨γ,ρ⟩:
- Confianza (γ): Intensidad de la señal (0 a 1). 
- Riesgo (ρ): Fragilidad basada en la volatilidad del entorno (σω)

### Álgebra de Etiquetas (Operadores LAF)
El motor debe aplicar estrictamente los siguientes operadores:
- Soporte (⊗): ⟨min(γe, γR), max(ρe, ρR)⟩.
- Agregación (⊕): Media aritmética de argumentos que apoyan la misma tesis (μ+ o μ−).
- Conflicto (⊖): ⟨max(0,γ+ − γ−), max(0,ρ+ − ρ−)⟩.

### Política de Decisión Final
Una recomendación solo se emite si se cumplen los umbrales de la tesis:
- Score (σ): 0.5 ⋅ γ + 0.5 ⋅ (1−ρ).
  - Umbral de Activación (θ): σ(μ) ≥ 0.67. 
- Umbral de Brecha (δ): σ(μdom) − σ(μinf) ≥ 0.20. 

## Feature de Inteligencia Artificial (ver desvío D3 arriba — diferido a v2)
El sistema debe incluir un flujo de proceso que tome la traza del grafo y genere una narrativa humana:
- Debe identificar argumentos DEFEATED (delta = 0.0) y ADMISSIBLE (delta > 0.0).
- El LLM debe redactar por qué se priorizó una señal sobre otra (ej: "Se recomienda comprar porque la sobreventa del RSI compensó la tendencia bajista de la SMA").

## Requerimientos de Implementación (Format)
- Backend: Next.js. 
- Frontend: Angular, librerías de visualización de grafos (para mostrar la trazabilidad).
- Automatización: n8n con Schedule Trigger cada 6 horas. 
- Deployment: Repositorio en GitHub sincronizado con Vercel.

## Definición de Hechos y Reglas (Base de Conocimiento)
- R1 a R4: Soportan tesis alcista (μ+) vía RSI < 30, MACD Hist > 0, SMA20 > SMA50, y Precio < Banda Inferior.
- R5 a R8: Soportan tesis bajista (μ−) vía RSI > 70, MACD Hist < 0, SMA20 < SMA50, y Precio > Banda Superior.