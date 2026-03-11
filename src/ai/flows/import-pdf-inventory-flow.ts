
'use server';
/**
 * @fileOverview Flow para importar productos desde un archivo PDF utilizando IA.
 * 
 * Este flujo utiliza Gemini para analizar documentos PDF (facturas, catálogos, listas)
 * y extraer una lista estructurada de productos para el inventario.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductSchema = z.object({
  name: z.string().describe("Nombre descriptivo del producto"),
  price: z.number().describe("Precio de venta unitario. Si no se detecta, usar 0."),
  stockQuantity: z.number().describe("Cantidad de unidades disponibles o en factura. Por defecto 0."),
  sku: z.string().optional().describe("Código de barras o referencia SKU si existe."),
  category: z.string().optional().describe("Categoría sugerida para el producto (ej. Bebidas, Limpieza)."),
  provider: z.string().optional().describe("Nombre del proveedor si figura en el documento."),
});

const ImportPdfInventoryInputSchema = z.object({
  pdfDataUri: z.string().describe("El archivo PDF codificado como data URI (base64)."),
});

const ImportPdfInventoryOutputSchema = z.object({
  products: z.array(ProductSchema).describe("Lista de productos extraídos del documento."),
});

export type ImportPdfInventoryInput = z.infer<typeof ImportPdfInventoryInputSchema>;
export type ImportPdfInventoryOutput = z.infer<typeof ImportPdfInventoryOutputSchema>;

/**
 * Función principal para importar inventario desde un PDF.
 * @param input Objeto con el PDF en formato Data URI.
 */
export async function importInventoryFromPdf(input: ImportPdfInventoryInput): Promise<ImportPdfInventoryOutput> {
  return importPdfInventoryFlow(input);
}

const importPdfInventoryFlow = ai.defineFlow(
  {
    name: 'importPdfInventoryFlow',
    inputSchema: ImportPdfInventoryInputSchema,
    outputSchema: ImportPdfInventoryOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: [
        { media: { url: input.pdfDataUri, contentType: 'application/pdf' } },
        { text: `Actúa como un experto en gestión de inventarios y contabilidad. 
        Analiza el documento PDF adjunto (puede ser una factura, un remito, una lista de precios o un catálogo de productos).
        
        Extrae todos los productos que encuentres. Para cada uno, identifica:
        1. Nombre del producto: Sé específico (ej. "Coca Cola 1.5L" en lugar de solo "Bebida").
        2. Precio: Busca el precio de venta o el costo unitario.
        3. Stock/Cantidad: Si es una factura, usa la cantidad comprada. Si es una lista, usa la cantidad disponible.
        4. SKU/Código: Cualquier código alfanumérico asociado.
        5. Categoría: Clasifica el producto según su uso común.
        
        IMPORTANTE: Devuelve una lista limpia. Si el documento tiene muchas páginas, procésalas todas.` }
      ],
      output: { schema: ImportPdfInventoryOutputSchema },
    });

    if (!output) {
      throw new Error("La IA no pudo procesar el contenido del PDF. Asegúrate de que el archivo sea legible.");
    }

    return output;
  }
);
