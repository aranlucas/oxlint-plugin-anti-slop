import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";

type IdentifierKind = { readonly type: "Identifier" };

export function resolveVariable(
  sourceCode: SourceCode,
  identifier: Extract<ESTree.Node, IdentifierKind>,
): Variable | null {
  let scope: Scope | null = sourceCode.getScope(identifier);

  while (scope !== null) {
    const variable = scope.set.get(identifier.name);

    if (variable !== undefined) {
      return variable;
    }

    scope = scope.upper;
  }

  return null;
}
