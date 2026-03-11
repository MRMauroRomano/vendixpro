'use server';
/**
 * @fileOverview Flow para importar productos desde un archivo PDF.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImportPdfInventoryInputSchema = z.object({
  pdfDataUri: z.string().describe("El archivo PDF codificado como data URI (base64)."),
});

const ProductSchema = z.object({
  name: z.string().describe("Nombre del producto"),
  price: z.number().describe("Precio de venta"),
  stockQuantity: z.number().describe("Cantidad inicial en stock"),
  sku: z.string().optional().describe("Código SKU o de barras"),
  category: z.string().optional().describe("Categoría del producto"),
  provider: z.string().optional().describe("Proveedor sugerido"),
});

const ImportPdfInventoryOutputSchema = z.object({
  products: z.array(ProductSchema).describe("Lista de productos extraídos del PDF"),
});

export type ImportPdfInventoryInput = z.infer<typeof ImportPdfInventoryInputSchema>;
export type ImportPdfInventoryOutput = z.infer<typeof ImportPdfInventoryOutputSchema>;

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
        { text: 'Analiza este documento PDF (que puede ser una factura, lista de precios o catálogo) y extrae todos los productos. Para cada producto identifica su nombre, precio, cantidad si figura, SKU y categoría. Si el precio no es claro, pon 0. Si la cantidad no figura, asume 0. Devuelve una lista estructurada.' }
      ],
      output: { schema: ImportPdfInventoryOutputSchema },
    });

    if (!output) {
      throw new Error("No se pudieron extraer productos del PDF.");
    }

    return output;
  }
);
