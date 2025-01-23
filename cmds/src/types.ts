import { z } from "zod";

const itemSchema = z.object({
  /**
   * Unique id, used to identify items when deleting etc.
   */
  id: z.string(),
  /**
   * Command title.
   */
  title: z.string(),
  /**
   * The command itself.
   */
  command: z.string(),
  /**
   * Information about the command.
   * Markdown formatted string.
   */
  notes: z.string().optional(),
  /**
   * Adding tags makes it easier to search for related commands.
   */
  tags: z.array(z.string()).optional(),
  /**
   * Optional icon, only from Raycast's builtin icons.
   */
  icon: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (val === undefined) return;
      const iconKeys = Object.keys(val);
      if (!iconKeys.includes(val))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${val}" is not a valid Icon`,
        });
    }),
});

const itemsSchema = z.array(itemSchema);

type Item = z.infer<typeof itemSchema>;
type Items = z.infer<typeof itemsSchema>;

export { itemSchema, itemsSchema };
export type { Item, Items };
