# PRD - Proyecto "Marco Argumentativo Financiero"

---

## Desvíos aprobados respecto a este PRD (change `faf-platform`, ver `openspec/changes/faf-platform/proposal.md`)

| # | Este PRD dice | Se implementa así | Motivo |
|---|---|---|---|
| D1 | Frontend: Angular | Next.js + React, una sola app | Simplicidad de despliegue para timeline de tesis en solitario |
| D2 | n8n envía webhooks "en formato RDF" | n8n solo dispara y trae datos crudos; la RDF-ificación (Capa 1) se hace en TypeScript | Mantener el código académicamente crítico bajo TDD estricto |
| D3 | Feature de IA (narrativa LLM) y grafo argumentativo visual son parte del sistema | Diferidos a v2 — v1 entrega decisión + traza completa en JSON/tabla | Son solo presentación sobre un núcleo de razonamiento que no cambia; la narrativa LLM es no determinística |
| D4 | Activo no especificado (ejemplos con AAPL) | Activos cripto vía Binance (público, sin API key) | RSI/MACD/SMA/Bollinger y R1-R8 son agnósticos al activo; solo cambia el ejemplo narrativo, no la fidelidad formal |

---

## Objetivo
Desarrollar un sistema de soporte a la toma de decisión financiero basado en el Marco Argumentativo Financiero. El sistema debe transformar flujos de datos de mercado en tiempo real en recomendaciones de inversión explicables y trazables, resolviendo conflictos entre indicadores técnicos mediante un motor de Argumentación Etiquetada (LAF).

## Arquitectura del Sistema
   
El software sigue una arquitectura de cuatro capas orientada al flujo de datos continuo (Stream Reasoning):
- Capa 1 - Ingesta Semántica (n8n): Orquestación de datos OHLCV e indicadores técnicos. Se enviarán periodicamente mediante webhooks en formato RDF. 
- Capa 2 - Procesamiento de Flujos (RSP): Evaluación de condiciones mediante ventanas deslizantes W(S, ω, β). Implementación de lógica para RSI, MACD, SMA y Bandas de Bollinger. 
- Capa 3 - Motor de Razonamiento (LAF): Núcleo lógico que gestiona el grafo argumentativo dinámico. Ya cuenta con una implementacion en Java Spring en: https://github.com/JaviDebortoli/LAF
- Capa 4 - Decisión e Interfaz (Angular + AI): Dashboard interactivo que muestra el "score" de las tesis y una narrativa de explicabilidad generada por un LLM.

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

## Feature de Inteligencia Artificial
El sistema debe incluir un flujo de proceso que tome la traza del grafo y genere una narrativa humana:
- Debe identificar argumentos DEFEATED (delta = 0.0) y ADMISSIBLE (delta > 0.0).
- El LLM debe redactar por qué se priorizó una señal sobre otra (ej: "Se recomienda comprar porque la sobreventa del RSI compensó la tendencia bajista de la SMA").

## Requerimientos de Implementación (Format)
- Backend: Next.js. 
- Frontend: Angular, librerías de visualización de grafos (para mostrar la trazabilidad).
- Automatización: n8n con Schedule Trigger cada 1-5 minutos. 
- Deployment: Repositorio en GitHub sincronizado con Vercel.

## Definición de Hechos y Reglas (Base de Conocimiento)
- R1 a R4: Soportan tesis alcista (μ+) vía RSI < 30, MACD Hist > 0, SMA20 > SMA50, y Precio < Banda Inferior.
- R5 a R8: Soportan tesis bajista (μ−) vía RSI > 70, MACD Hist < 0, SMA20 < SMA50, y Precio > Banda Superior.