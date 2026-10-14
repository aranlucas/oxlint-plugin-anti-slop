import type { ESTree } from "@oxlint/plugins";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

type Child = ESTree.Node | (ESTree.Node | null)[] | null | undefined;

type TraversableNode = ESTree.Node & Readonly<Record<string, Child>>;

/** Read only child fields declared by the parser's visitor keys. */
export function childNodes(node: ESTree.Node, visitorKeys: VisitorKeys): readonly ESTree.Node[] {
  // SAFETY: Oxlint supplies the AST and matching visitor keys. These keys contain only nodes,
  // arrays of nodes (with null array-pattern holes), or absent children, never metadata.
  const fields = node as TraversableNode;
  const children: ESTree.Node[] = [];

  for (const key of visitorKeys[node.type] ?? []) {
    const child = fields[key];

    if (child === null || child === undefined) {
      continue;
    }

    if (Array.isArray(child)) {
      for (const entry of child) {
        if (entry !== null) {
          children.push(entry);
        }
      }
    } else {
      children.push(child);
    }
  }

  return children;
}
