import type { ChatPromptMeta } from "@/src/types/chat";

function appendDocumentSourceRules(meta: ChatPromptMeta): string[] {
  const intent = meta.intent ?? "consulta";
  if (intent === "conversacional") return [];

  const lines: string[] = [];

  if (meta.documentEvidenceActive) {
    lines.push(
      "",
      "## Texto fuente del documento (evidencia recuperada)",
      "El contexto incluye el bloque 'Evidencia documental relevante' o 'Evidencia documental cruzada': fragmentos del texto extraido del PDF, seleccionados por seccion segun la pregunta.",
      "Prioriza ese bloque frente a inferencias o parafrasis del analisis documental cuando la pregunta pida datos puntuales (nombres, alcance, objetivos, normativa, requerimientos, secciones).",
      "Si aparecen nombres propios, cargos o listas en la evidencia, no los sustituyas por roles genericos.",
      "Si el usuario pide 'textualmente' o una cita literal y no esta en la evidencia ni en el resto del contexto, dilo sin inventar.",
    );

    const ref = meta.documentPrimarySectionRef?.trim();
    const multi = (meta.documentEvidenceCount ?? 0) > 1;

    lines.push(
      "",
      "## Trazabilidad y citacion academica (solo porque hay evidencia recuperada)",
      "Solo en esta situacion (bloque de evidencia presente) debes anclar la respuesta al documento con tono formal cuando el contenido provenga de ese bloque.",
    );

    if (ref) {
      lines.push(
        `Seccion principal identificada por el sistema para citar: "${ref}". Debe coincidir con el primer fragmento destacado dentro del bloque de evidencia.`,
        "Si la respuesta se apoya en ese fragmento, menciona la fuente de forma natural al inicio o en la primera frase sustantiva, por ejemplo:",
        `- "Segun la seccion ${ref} del documento, ..."`,
        `- "De acuerdo con la seccion ${ref}, ..."`,
        `- "En la seccion ${ref} del documento se indica que ..."`,
        `Usa exactamente esa referencia (${ref}); no inventes otros numeros, titulos de seccion ni subapartados que no consten en el contexto.`,
      );
      if (multi) {
        lines.push(
          "Hay varios fragmentos en el bloque de evidencia: puedes mencionar otras secciones citadas alli si aportan, pero la primera cita explicita debe priorizar la seccion principal indicada.",
        );
      }
    } else {
      lines.push(
        "No se proporciono una referencia de seccion principal clara: no inventes numeracion ni titulos de seccion.",
        "Si necesitas contextualizar la fuente, usa formulas generales como:",
        '- "Con base en la evidencia documental recuperada en el contexto, ..."',
        '- "De acuerdo con los fragmentos del documento fuente incluidos en el contexto, ..."',
      );
    }

    if (intent === "analisis") {
      lines.push(
        "En modo analisis: cuando el argumento se apoye en la evidencia, incorpora la referencia a la seccion principal (si figura arriba) preferentemente en ### Resumen y, si aplica, en ### Observaciones.",
      );
    } else {
      lines.push(
        "En modo consulta: si la respuesta se apoya en la evidencia, incorpora la referencia a la seccion principal en la primera parte relevante; no uses formulas de cita vacias si no estas usando el fragmento.",
      );
    }

    lines.push(
      "No afirmes que algo proviene del documento ni cites secciones si tu razonamiento no se apoya de hecho en el bloque de evidencia o en el resto del contexto.",
    );
  } else if (meta.documentQuestionType === "specific") {
    lines.push(
      "",
      "## Pregunta puntual sobre el documento",
      "No se incluyo un fragmento de alta confianza del PDF para esta pregunta: no inventes nombres, numeros de seccion, listados ni normativa que no consten en el contexto.",
      "Si solo tienes el analisis documental (resumen), indiclo y no confundas resumen con texto legal o contractual literal.",
    );
  }

  return lines;
}

/**
 * Refuerzo solo para analisis en fase mixta con extracto codigo_pr presente.
 * No afecta conversacional, consulta ni analisis documental sin codigo.
 */
function appendTechnicalCodeEvidenceRules(meta: ChatPromptMeta): string[] {
  const intent = meta.intent ?? "consulta";
  if (intent !== "analisis") return [];
  if (meta.phaseMode !== "mixto") return [];
  if (!meta.codePrEvidenceActive) return [];

  return [
    "",
    "## Analisis tecnico con evidencia de codigo (obligatorio en este contexto)",
    "El contexto incluye revision de codigo y extracto del PR (codigo_pr): el analisis debe ser especifico y anclado a esa evidencia; evita respuestas genericas o solo declarativas.",
    "",
    "### Contenido esperado",
    "1. Menciona elementos tecnicos concretos que consten en el extracto o en el analisis de codigo del contexto, por ejemplo:",
    "   - nombres de funciones, metodos o clases",
    "   - endpoints o rutas (p. ej. /auth/login)",
    "   - metodos HTTP (GET, POST, etc.) si aparecen",
    "   - validaciones, guards, middlewares o comprobaciones visibles en el fragmento",
    "   - estructuras relevantes (DTOs, esquemas, servicios) solo si aparecen en el contexto",
    "",
    "2. Relaciona de forma explicita:",
    "   - lo que pide o describe el documento o el analisis documental",
    "   - como se refleja (o no) en el codigo / PR mostrado",
    "",
    "3. Cuando encaje, organiza al menos una parte del razonamiento con este esquema (puedes usar subtitulos en Markdown):",
    "   - **Funcionalidad** (breve)",
    "   - **Documento**: que solicita o exige segun el contexto",
    "   - **Codigo**: como se implementa segun el extracto o el analisis de codigo",
    "   - **Evidencia**: cita literal o parafrase muy cercana al fragmento (funcion, endpoint, validacion, etc.)",
    "",
    "### Reglas criticas",
    "- No respondas de forma generica cuando afirmes algo sobre la implementacion.",
    "- Evita formulaciones dubitativas como \"el codigo parece\", \"probablemente\", \"generalmente\", salvo que el contexto sea explicitamente insuficiente; en ese caso dilo y no especules.",
    "- Cada vez que describas comportamiento de la implementacion, incluye al menos un ancla concreta tomada del contexto (funcion, endpoint, validacion o comportamiento observable descrito en el extracto).",
    "- Si el contexto no contiene fragmento util sobre un aspecto concreto del codigo, escribe de forma explicita: \"No se encontro evidencia en el codigo proporcionado\" para ese punto, sin inventar archivos ni rutas.",
    "",
    "### Validaciones y coherencia",
    "Analiza cuando el contexto lo permita: validacion de datos, reglas de negocio, control de acceso o autenticacion/autorizacion, y coherencia logica entre documento e implementacion. Si no hay datos en el contexto para uno de esos puntos, indiclo en lugar de suponer.",
    "",
    "### Diferencias",
    "Identifica, con evidencia:",
    "- funcionalidades o requisitos que estan en el documento pero no ves respaldados en el codigo mostrado;",
    "- comportamientos presentes en el codigo mostrado que no se desprenden claramente del documento.",
    "",
    "### Cumplimiento (seccion ### Cumplimiento)",
    "Usa la etiqueta exacta que exige la plantilla global (Completo | Parcial | No claro | No cumple) y justifica con evidencia del documento y del codigo cuando el tema sea la implementacion frente a lo documentado.",
  ];
}

const STRUCTURED_SECTIONS = `Tu respuesta DEBE usar exactamente estas secciones en Markdown (titulo en ### seguido de contenido), en este orden:

### Resumen
Breve sintesis de lo relevante segun el contexto y la pregunta.

### Cumplimiento
Elige UNA etiqueta exacta: Completo | Parcial | No claro | No cumple
Explica en 1-3 frases por que, citando solo evidencia del contexto.

### Observaciones
Puntos tecnicos o funcionales importantes. Si no hay suficiente informacion, indica: "No hay observaciones sustentadas en el contexto."

### Riesgos
Riesgos, inconsistencias o faltantes. Si no hay evidencia, indica: "No hay riesgos identificables con la evidencia disponible."

### Recomendacion
Siguiente accion sugerida o mejora. Si no puedes sustentarla con el contexto, indica: "No hay recomendacion clara sin datos adicionales."`;

function appendScopeRulesAnalisis(meta: ChatPromptMeta): string[] {
  const lines: string[] = [];

  if (meta.generalBroad) {
    const loaded = meta.projectTasksLoaded ?? 0;
    const available = meta.projectTasksAvailable ?? loaded;
    const scopeLine =
      available > loaded
        ? `Actualmente tengo contexto de ${loaded} de ${available} tareas disponibles, por lo que el analisis puede ser parcial.`
        : `El analisis considera las ${loaded} tareas registradas del tablero SICOP.`;

    lines.push(
      "",
      "## Contexto general (varias tareas)",
      "El contexto lista varias tareas: cada bloque indica si la tarea es documental (sin datos de codigo) o mixta.",
      `Incluye esta aclaracion de alcance en el Resumen cuando la pregunta sea general del proyecto: "${scopeLine}"`,
      "Si el usuario pide listar tareas, ver el contexto de todas las tareas, saber que tareas existen o revisar el estado general, incluye en cada tarea el enlace de Trello como `Enlace: URL` cuando el contexto tenga `URL Trello` distinto de `N/D`.",
      "No compares documentacion con codigo para una tarea marcada como documental o cuando el bloque no incluya revision de codigo.",
      "Si el contexto incluye un subtitulo 'Modo comparativo documentacion vs codigo' para una tarea, debes integrar ese analisis comparativo en Resumen, Cumplimiento, Observaciones, Riesgos y Recomendacion cuando la pregunta lo requiera.",
    );
    return lines;
  }

  if (meta.comparativeActive) {
    lines.push(
      "",
      "## Modo comparativo activo",
      "El contexto incluye el bloque 'Modo comparativo documentacion vs codigo': debes usarlo de forma explicita.",
      "En Resumen y Cumplimiento prioriza la alineacion (o desalineacion) entre lo documentado y la evidencia de codigo/PR.",
      "En Observaciones y Riesgos destaca brechas entre documentacion e implementacion cuando la evidencia lo permita.",
    );
    return lines;
  }

  if (meta.phaseMode === "mixto") {
    lines.push(
      "",
      "## Fase mixta sin comparacion completa",
      "La tarea es de fase mixta pero falta revision documental o de codigo en el contexto: no fuerces una comparacion bilateral.",
      "Indica en Observaciones que falta evidencia para un analisis comparativo completo, si aplica.",
    );
    return lines;
  }

  if (meta.phaseMode === "documental") {
    lines.push(
      "",
      "## Fase documental",
      "No compares con revision de codigo: el contexto no incluye PR, diff ni analisis de codigo para esta tarea.",
    );
    return lines;
  }

  lines.push(
    "",
    "## Alcance del contexto",
    "Sigue la estructura de secciones. Si el contexto es insuficiente o no describe una tarea valida, dilo en Resumen y en Cumplimiento elige 'No claro'.",
  );
  return lines;
}

/** Reglas de fase y alcance en prosa (sin exigir secciones ###). */
function appendScopeRulesConsulta(meta: ChatPromptMeta): string[] {
  const lines: string[] = [];

  if (meta.generalBroad) {
    const loaded = meta.projectTasksLoaded ?? 0;
    const available = meta.projectTasksAvailable ?? loaded;
    const scopeLine =
      available > loaded
        ? `Actualmente tengo contexto de ${loaded} de ${available} tareas disponibles, por lo que el analisis puede ser parcial.`
        : `El analisis considera las ${loaded} tareas registradas del tablero SICOP.`;

    lines.push(
      "",
      "## Alcance (varias tareas)",
      "Varias tareas aparecen en el contexto; respeta el modo documental o mixto de cada bloque.",
      `Incluye esta aclaracion de alcance cuando la pregunta sea general del proyecto: "${scopeLine}"`,
      "Si el usuario pide listar tareas, ver el contexto de todas las tareas, saber que tareas existen o revisar el estado general, incluye en cada tarea el enlace de Trello como `Enlace: URL` cuando el contexto tenga `URL Trello` distinto de `N/D`.",
      "No asumas datos de codigo o PR para tareas en modo documental.",
      "Si un bloque incluye 'Modo comparativo documentacion vs codigo', puedes contrastar documentacion e implementacion solo para esa tarea y solo con la evidencia mostrada.",
    );
    return lines;
  }

  if (meta.comparativeActive) {
    lines.push(
      "",
      "## Comparacion documentacion vs codigo",
      "El contexto trae un bloque comparativo explicito: usalo para contrastar requisitos documentados con la evidencia del PR/codigo, sin inventar fuera de ese material.",
    );
    return lines;
  }

  if (meta.phaseMode === "mixto") {
    lines.push(
      "",
      "## Fase mixta",
      "Si falta revision documental o de codigo en el contexto, no afirmes comparaciones completas; dilo con claridad.",
    );
    return lines;
  }

  if (meta.phaseMode === "documental") {
    lines.push(
      "",
      "## Fase documental",
      "No compares con revision de codigo: el contexto no incluye PR, diff ni analisis de codigo para esta tarea.",
    );
    return lines;
  }

  lines.push(
    "",
    "## Contexto",
    "Si el contexto es insuficiente, dilo de forma breve y concreta.",
  );
  return lines;
}

export function buildChatSystemPrompt(meta: ChatPromptMeta): string {
  const intent = meta.intent ?? "consulta";

  const base = [
    "Eres el asistente del proyecto SICOP.",
    "Usa solo la informacion del contexto provisto; no inventes datos fuera de eso.",
    "Responde en espanol.",
  ];

  if (intent === "conversacional") {
    return [
      ...base,
      "",
      "## Modo conversacional",
      "Responde de forma breve y natural, como en un chat cotidiano.",
      "No uses la estructura de analisis (Resumen, Cumplimiento, Observaciones, Riesgos, Recomendacion) ni titulos fijos equivalentes.",
      "No inventes revisiones, tareas ni conclusiones de proyecto.",
      "Si el usuario solo saluda o agradece, responde cordialmente y ofrece ayuda con el proyecto SICOP.",
      "Si preguntan algo sustantivo del proyecto, puedes responder breve con lo que haya en el contexto, o sugerir una pregunta mas concreta / pedir un analisis con terminos como \"analiza\" o \"evaluar\".",
    ].join("\n");
  }

  if (intent === "consulta") {
    return [
      ...base,
      "",
      "## Modo consulta",
      "Responde de forma directa y clara; puedes usar listas con guiones o numeros cuando ayuden a leer.",
      "No uses la estructura obligatoria por secciones (Resumen, Cumplimiento, Observaciones, Riesgos, Recomendacion).",
      "Evita informes largos salvo que la pregunta lo exija de forma evidente.",
      ...appendScopeRulesConsulta(meta),
      ...appendDocumentSourceRules(meta),
    ].join("\n");
  }

  return [
    ...base,
    "Si falta informacion para alguna seccion del analisis, dilo en esa seccion sin inventar.",
    "No afirmes cumplimiento Completo si la evidencia no lo respalda.",
    "",
    STRUCTURED_SECTIONS,
    ...appendScopeRulesAnalisis(meta),
    ...appendTechnicalCodeEvidenceRules(meta),
    ...appendDocumentSourceRules(meta),
  ].join("\n");
}
