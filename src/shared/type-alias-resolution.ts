import type { ESTree } from "@oxlint/plugins";

import { childNodes } from "./child-nodes.ts";

import { lexicalTypeParameterNames } from "./lexical-type-parameters.ts";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

type TypeScope = ESTree.Node;

type TypeBinding = {
  readonly alias: ESTree.TSTypeAliasDeclaration | null;
  readonly interfaceDeclaration?: ESTree.TSInterfaceDeclaration;
  readonly name: string;
  readonly scope: TypeScope;
};

type Substitution = {
  readonly resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>;
  readonly substitutions: Substitutions;
  readonly type: ESTree.TSType;
};

export type Substitutions = ReadonlyMap<string, Substitution>;

type DeclaredTypeBinding = {
  readonly alias: ESTree.TSTypeAliasDeclaration | null;
  readonly interfaceDeclaration?: ESTree.TSInterfaceDeclaration;
  readonly name: string;
};

export type TypeAliasEnvironment = {
  readonly bindingsByName: ReadonlyMap<string, readonly TypeBinding[]>;
  readonly visitorKeys: VisitorKeys;
};

export type ResolvedTypeMatcher = (
  type: ESTree.TSType,
  matches: (child: ESTree.TSType) => boolean,
) => boolean;

const environmentsByProgram = new WeakMap<ESTree.Program, TypeAliasEnvironment>();

function enclosingTypeScope(node: ESTree.Node): TypeScope {
  let current: ESTree.Node | null = node.parent;

  while (current !== null) {
    if (
      current.type === "Program" ||
      current.type === "BlockStatement" ||
      current.type === "TSModuleBlock" ||
      current.type === "StaticBlock" ||
      current.type === "SwitchStatement"
    ) {
      return current;
    }

    current = current.parent;
  }

  return node;
}

function declaredTypeBinding(node: ESTree.Node): DeclaredTypeBinding | null {
  if (node.type === "TSTypeAliasDeclaration") {
    return { alias: node, name: node.id.name };
  }

  if (node.type === "TSInterfaceDeclaration") {
    return { alias: null, name: node.id.name, interfaceDeclaration: node };
  }

  if (
    node.type === "TSEnumDeclaration" ||
    node.type === "ClassDeclaration" ||
    node.type === "ClassExpression"
  ) {
    return node.id === null ? null : { alias: null, name: node.id.name };
  }

  if (
    node.type === "ImportSpecifier" ||
    node.type === "ImportDefaultSpecifier" ||
    node.type === "ImportNamespaceSpecifier"
  ) {
    return { alias: null, name: node.local.name };
  }

  return null;
}

function collectTypeBindings(
  node: ESTree.Node,
  visitorKeys: VisitorKeys,
  bindingsByName: Map<string, TypeBinding[]>,
): void {
  const declared = declaredTypeBinding(node);

  if (declared !== null) {
    const bindings = bindingsByName.get(declared.name) ?? [];
    bindings.push({
      ...declared,
      scope: node.type === "ClassExpression" ? node : enclosingTypeScope(node),
    });
    bindingsByName.set(declared.name, bindings);
  }

  for (const child of childNodes(node, visitorKeys)) {
    collectTypeBindings(child, visitorKeys, bindingsByName);
  }
}

export function createTypeAliasEnvironment(
  program: ESTree.Program,
  visitorKeys: VisitorKeys,
): TypeAliasEnvironment {
  const cached = environmentsByProgram.get(program);

  if (cached !== undefined) {
    return cached;
  }

  const bindingsByName = new Map<string, TypeBinding[]>();
  collectTypeBindings(program, visitorKeys, bindingsByName);
  const environment = { bindingsByName, visitorKeys };
  environmentsByProgram.set(program, environment);

  return environment;
}

function ancestorDistance(ancestor: ESTree.Node, node: ESTree.Node): number | null {
  let current: ESTree.Node | null = node;
  let distance = 0;

  while (current !== null) {
    if (current === ancestor) {
      return distance;
    }

    current = current.parent;

    distance += 1;
  }

  return null;
}

function nearestTypeBindings(
  name: string,
  use: ESTree.Node,
  environment: TypeAliasEnvironment,
): readonly TypeBinding[] {
  const candidates = environment.bindingsByName.get(name) ?? [];
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearest: TypeBinding[] = [];

  for (const candidate of candidates) {
    const distance = ancestorDistance(candidate.scope, use);

    if (distance === null || distance > nearestDistance) {
      continue;
    }

    if (distance === nearestDistance) {
      nearest.push(candidate);
      continue;
    }

    nearestDistance = distance;
    nearest = [candidate];
  }

  return nearest;
}

export function visibleTypeAlias(
  name: string,
  use: ESTree.Node,
  environment: TypeAliasEnvironment,
): ESTree.TSTypeAliasDeclaration | null {
  if (lexicalTypeParameterNames(use, environment.visitorKeys).has(name)) {
    return null;
  }

  const bindings = nearestTypeBindings(name, use, environment);

  return bindings.length === 1 ? (bindings[0]?.alias ?? null) : null;
}

export function visibleTypeInterfaces(
  name: string,
  use: ESTree.Node,
  environment: TypeAliasEnvironment,
): readonly ESTree.TSInterfaceDeclaration[] {
  if (lexicalTypeParameterNames(use, environment.visitorKeys).has(name)) {
    return [];
  }

  const bindings = nearestTypeBindings(name, use, environment);

  if (bindings.some((binding) => binding.interfaceDeclaration === undefined)) {
    return [];
  }

  return bindings.flatMap((binding) =>
    binding.interfaceDeclaration === undefined ? [] : [binding.interfaceDeclaration],
  );
}

export function hasVisibleTypeBinding(
  name: string,
  use: ESTree.Node,
  environment: TypeAliasEnvironment,
): boolean {
  return (
    lexicalTypeParameterNames(use, environment.visitorKeys).has(name) ||
    nearestTypeBindings(name, use, environment).length > 0
  );
}

function typeReferenceName(type: ESTree.TSTypeReference): string | null {
  return type.typeName.type === "Identifier" ? type.typeName.name : null;
}

export function aliasSubstitutions(
  alias: ESTree.TSTypeAliasDeclaration,
  reference: ESTree.TSTypeReference,
  base: Substitutions,
  resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>,
): Substitutions | null {
  const parameters = alias.typeParameters?.params ?? [];
  const typeArguments = reference.typeArguments?.params ?? [];
  const next = new Map<string, Substitution>();

  for (const [index, parameter] of parameters.entries()) {
    const explicitArgument = typeArguments[index];
    const argument = explicitArgument ?? parameter.default;

    if (argument === null || argument === undefined) {
      return null;
    }

    const argumentSubstitutions = explicitArgument === undefined ? next : base;
    next.set(parameter.name.name, {
      type: argument,
      resolvingAliases:
        explicitArgument === undefined ? new Set([...resolvingAliases, alias]) : resolvingAliases,
      substitutions: new Map(argumentSubstitutions),
    });
  }

  return next;
}

export function resolvedTypeMatches(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
  matcher: ResolvedTypeMatcher,
): boolean {
  const evaluate = (
    current: ESTree.TSType,
    substitutions: Substitutions,
    resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>,
  ): boolean => {
    if (current.type === "TSTypeReference") {
      const name = typeReferenceName(current);

      if (name !== null) {
        const substitution = substitutions.get(name);

        if (substitution !== undefined && !current.typeArguments?.params.length) {
          return evaluate(
            substitution.type,
            substitution.substitutions,
            substitution.resolvingAliases,
          );
        }

        const alias = visibleTypeAlias(name, current, environment);

        if (alias !== null && !resolvingAliases.has(alias)) {
          const nextSubstitutions = aliasSubstitutions(
            alias,
            current,
            substitutions,
            resolvingAliases,
          );

          if (nextSubstitutions !== null) {
            const nextResolving = new Set([...resolvingAliases, alias]);

            return evaluate(alias.typeAnnotation, nextSubstitutions, nextResolving);
          }
        }
      }
    }

    return matcher(current, (child) => evaluate(child, substitutions, resolvingAliases));
  };

  return evaluate(type, new Map(), new Set());
}
