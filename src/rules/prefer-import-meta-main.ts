import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";

const equalityOperators = new Set(["===", "!==", "==", "!="]);

const moduleImports = new Set(["*", "default"]);

function isMember(node: ESTree.Node, name: string): node is ESTree.MemberExpression {
  if (node.type !== "MemberExpression" || node.optional) {
    return false;
  }

  const property = node.property;

  return node.computed
    ? property.type === "Literal" && String(property.value) === name
    : property.type === "Identifier" && property.name === name;
}

/** Resolve static Node imports, including aliases, without trusting a local name. */
function importSpecifier(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
  module: string,
): ESTree.Node | null {
  const definition = resolveVariable(sourceCode, identifier)?.defs[0];

  if (definition?.type !== "ImportBinding") {
    return null;
  }

  const specifier = definition.node;
  const declaration = specifier.parent;

  if (declaration?.type !== "ImportDeclaration" || declaration.importKind === "type") {
    return null;
  }

  if (![module, `node:${module}`].includes(declaration.source.value)) {
    return null;
  }

  return specifier;
}

function importedName(
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
  module: string,
): string | null {
  const specifier = importSpecifier(sourceCode, identifier, module);

  if (specifier?.type === "ImportNamespaceSpecifier") {
    return "*";
  }

  if (specifier?.type === "ImportDefaultSpecifier") {
    return "default";
  }

  if (specifier?.type !== "ImportSpecifier" || specifier.importKind === "type") {
    return null;
  }

  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value;
}

function isModuleImport(
  sourceCode: SourceCode,
  node: ESTree.Expression | ESTree.Super,
  module: string,
): boolean {
  if (node.type !== "Identifier") {
    return false;
  }

  const name = importedName(sourceCode, node, module);

  return name !== null && moduleImports.has(name);
}

function isUrlFunction(
  sourceCode: SourceCode,
  node: ESTree.Expression | ESTree.Super,
  name: string,
): boolean {
  if (node.type === "Identifier") {
    return importedName(sourceCode, node, "url") === name;
  }

  return isMember(node, name) && isModuleImport(sourceCode, node.object, "url");
}

function isProcess(sourceCode: SourceCode, node: ESTree.Expression | ESTree.Super): boolean {
  if (node.type === "Identifier" && node.name === "process") {
    const variable = resolveVariable(sourceCode, node);

    if (variable === null || variable.defs.length === 0) {
      return true;
    }
  }

  return isModuleImport(sourceCode, node, "process");
}

function isEntryPath(sourceCode: SourceCode, node: ESTree.Node): boolean {
  return (
    isMember(node, "1") &&
    isMember(node.object, "argv") &&
    isProcess(sourceCode, node.object.object)
  );
}

function isImportMetaProperty(node: ESTree.Node, name: string): boolean {
  if (!isMember(node, name)) {
    return false;
  }

  const object = node.object;

  return (
    object.type === "MetaProperty" &&
    object.meta.name === "import" &&
    object.property.name === "meta"
  );
}

function urlConversionArgument(
  sourceCode: SourceCode,
  node: ESTree.Node,
  name: string,
): ESTree.Argument | null {
  if (node.type !== "CallExpression" || node.optional || node.arguments.length !== 1) {
    return null;
  }

  return isUrlFunction(sourceCode, node.callee, name) ? node.arguments[0] : null;
}

function isEntryUrl(sourceCode: SourceCode, node: ESTree.Node): boolean {
  if (!isMember(node, "href")) {
    return false;
  }

  const argument = urlConversionArgument(sourceCode, node.object, "pathToFileURL");

  return argument !== null && isEntryPath(sourceCode, argument);
}

function isModuleFilename(sourceCode: SourceCode, node: ESTree.Node): boolean {
  if (isImportMetaProperty(node, "filename")) {
    return true;
  }

  const argument = urlConversionArgument(sourceCode, node, "fileURLToPath");

  return argument !== null && isImportMetaProperty(argument, "url");
}

function comparesEntryPoint(
  sourceCode: SourceCode,
  module: ESTree.Node,
  entry: ESTree.Node,
): boolean {
  if (isImportMetaProperty(module, "url")) {
    return isEntryUrl(sourceCode, entry);
  }

  return isModuleFilename(sourceCode, module) && isEntryPath(sourceCode, entry);
}

/** Prefer runtime entry-point identity in projects whose supported Node versions provide it. */
export const preferImportMetaMainRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer import.meta.main over lexical comparisons with process.argv[1].",
    },
    schema: [],
    messages: {
      preferMain:
        "Use import.meta.main (or its negation) to identify the entry point instead of comparing paths. Enable this policy only when every supported runtime provides import.meta.main.",
    },
  },
  createOnce(context) {
    return {
      BinaryExpression(node) {
        if (!equalityOperators.has(node.operator)) {
          return;
        }

        const sourceCode = context.sourceCode;

        if (
          comparesEntryPoint(sourceCode, node.left, node.right) ||
          comparesEntryPoint(sourceCode, node.right, node.left)
        ) {
          context.report({ node, messageId: "preferMain" });
        }
      },
    };
  },
});
