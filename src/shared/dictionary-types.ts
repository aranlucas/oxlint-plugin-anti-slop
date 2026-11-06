import type { ESTree } from "@oxlint/plugins";

import {
  aliasSubstitutions,
  visibleTypeInterfaces,
  type Substitutions,
  hasVisibleTypeBinding,
  visibleTypeAlias,
  type TypeAliasEnvironment,
} from "./type-alias-resolution.ts";

const BUILT_INS = new Set([
  "Record",
  "Readonly",
  "Partial",
  "Required",
  "Pick",
  "Omit",
  "PropertyKey",
  "NonNullable",
]);

const TRANSPARENT_WRAPPERS = new Set(["Readonly", "Partial", "Required", "NonNullable"]);

type ResolvedType = {
  readonly type: ESTree.TSType;
  readonly substitutions: Substitutions;
};

export type UnsafeDictionary = {
  readonly kind: "unsafe-dictionary";
  readonly unsafeValue: "any" | "empty-object" | "object" | "union" | "unknown";
};

export type WideningTargetKind =
  | "anonymous object"
  | "generic container"
  | "object"
  | "open dictionary"
  | "unknown";

export type WideningTarget = {
  readonly kind: WideningTargetKind;
};

function typeReferenceName(type: ESTree.TSTypeReference): string | null {
  return type.typeName.type === "Identifier" ? type.typeName.name : null;
}

function isBuiltIn(name: string, use: ESTree.Node, environment: TypeAliasEnvironment): boolean {
  return BUILT_INS.has(name) && !hasVisibleTypeBinding(name, use, environment);
}

function unwrapTransparentType(type: ESTree.TSType): ESTree.TSType {
  let current = type;

  while (
    current.type === "TSParenthesizedType" ||
    (current.type === "TSTypeOperator" && current.operator === "readonly")
  ) {
    current = current.typeAnnotation;
  }

  return current;
}

function isNeverType(type: ESTree.TSType): boolean {
  return unwrapTransparentType(type).type === "TSNeverKeyword";
}

function isEffectivelyEmptyMember(member: ESTree.TSSignature): boolean {
  return (
    member.type === "TSPropertySignature" &&
    member.optional === true &&
    member.typeAnnotation !== null &&
    member.typeAnnotation !== undefined &&
    isNeverType(member.typeAnnotation.typeAnnotation)
  );
}

function isEffectivelyEmptyTypeLiteral(type: ESTree.TSTypeLiteral): boolean {
  return type.members.length === 0 || type.members.every(isEffectivelyEmptyMember);
}

function isEffectivelyEmptyInterface(
  declarations: readonly ESTree.TSInterfaceDeclaration[],
): boolean {
  if (declarations.length !== 1) {
    return false;
  }

  const [type] = declarations;

  return (
    type?.extends.length === 0 &&
    (type.body.body.length === 0 || type.body.body.every(isEffectivelyEmptyMember))
  );
}

function unsafeDirectValue(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
  substitutions: Substitutions,
  resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>,
): UnsafeDictionary["unsafeValue"] | null {
  const unwrapped = unwrapTransparentType(type);

  if (unwrapped.type === "TSUnknownKeyword") {
    return "unknown";
  }

  if (unwrapped.type === "TSAnyKeyword") {
    return "any";
  }

  if (unwrapped.type === "TSObjectKeyword") {
    return "object";
  }

  if (unwrapped.type === "TSTypeLiteral" && isEffectivelyEmptyTypeLiteral(unwrapped)) {
    return "empty-object";
  }

  if (unwrapped.type === "TSUnionType") {
    return unwrapped.types.some(
      (member) => unsafeDirectValue(member, environment, substitutions, resolvingAliases) !== null,
    )
      ? "union"
      : null;
  }

  if (unwrapped.type === "TSIntersectionType") {
    const unsafeMembers = unwrapped.types.map((member) =>
      unsafeDirectValue(member, environment, substitutions, resolvingAliases),
    );

    if (unsafeMembers.includes("any")) {
      return "any";
    }

    return unsafeMembers.length > 0 && unsafeMembers.every((member) => member !== null)
      ? unsafeMembers[0]
      : null;
  }

  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);

  if (name === null) {
    return null;
  }

  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, unwrapped, environment)) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? null
      : unsafeDirectValue(wrapped, environment, substitutions, resolvingAliases);
  }

  const substitution = substitutions.get(name);

  if (substitution !== undefined) {
    return unsafeDirectValue(
      substitution.type,
      environment,
      substitution.substitutions,
      substitution.resolvingAliases,
    );
  }

  const interfaceDeclarations = visibleTypeInterfaces(name, unwrapped, environment);

  if (interfaceDeclarations.length > 0) {
    return isEffectivelyEmptyInterface(interfaceDeclarations) ? "empty-object" : null;
  }

  const alias = visibleTypeAlias(name, unwrapped, environment);

  if (alias === null || resolvingAliases.has(alias)) {
    return null;
  }

  const nextSubstitutions = aliasSubstitutions(alias, unwrapped, substitutions, resolvingAliases);

  if (nextSubstitutions === null) {
    return null;
  }

  const nextResolving = new Set([...resolvingAliases, alias]);

  return unsafeDirectValue(alias.typeAnnotation, environment, nextSubstitutions, nextResolving);
}

function dictionaryValueTypes(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
  substitutions: Substitutions,
  resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>,
): readonly ResolvedType[] {
  const unwrapped = unwrapTransparentType(type);

  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.flatMap((member): readonly ResolvedType[] =>
      member.type === "TSIndexSignature" && member.typeAnnotation !== null
        ? [{ type: member.typeAnnotation.typeAnnotation, substitutions }]
        : [],
    );
  }

  if (unwrapped.type === "TSMappedType") {
    return unwrapped.typeAnnotation === null
      ? []
      : [{ type: unwrapped.typeAnnotation, substitutions }];
  }

  if (unwrapped.type !== "TSTypeReference") {
    return [];
  }

  const name = typeReferenceName(unwrapped);

  if (name === null) {
    return [];
  }

  const substitution = substitutions.get(name);

  if (substitution !== undefined) {
    return dictionaryValueTypes(
      substitution.type,
      environment,
      substitution.substitutions,
      substitution.resolvingAliases,
    );
  }

  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, unwrapped, environment)) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? []
      : dictionaryValueTypes(wrapped, environment, substitutions, resolvingAliases);
  }

  if (name === "Record" && isBuiltIn(name, unwrapped, environment)) {
    const value = unwrapped.typeArguments?.params[1] ?? null;

    return value === null ? [] : [{ type: value, substitutions }];
  }

  if ((name === "Pick" || name === "Omit") && isBuiltIn(name, unwrapped, environment)) {
    const source = unwrapped.typeArguments?.params[0];

    return source === undefined
      ? []
      : dictionaryValueTypes(source, environment, substitutions, resolvingAliases);
  }

  const alias = visibleTypeAlias(name, unwrapped, environment);

  if (alias === null || resolvingAliases.has(alias)) {
    return [];
  }

  const nextSubstitutions = aliasSubstitutions(alias, unwrapped, substitutions, resolvingAliases);

  if (nextSubstitutions === null) {
    return [];
  }

  const nextResolving = new Set([...resolvingAliases, alias]);

  return dictionaryValueTypes(alias.typeAnnotation, environment, nextSubstitutions, nextResolving);
}

export function classifyUnsafeDictionaryValue(
  valueType: ESTree.TSType,
  environment: TypeAliasEnvironment,
): UnsafeDictionary | null {
  const unsafeValue = unsafeDirectValue(valueType, environment, new Map(), new Set());

  return unsafeValue === null ? null : { kind: "unsafe-dictionary", unsafeValue };
}

export function classifyUnsafeDictionary(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
): UnsafeDictionary | null {
  for (const valueType of dictionaryValueTypes(type, environment, new Map(), new Set())) {
    const unsafeValue = unsafeDirectValue(
      valueType.type,
      environment,
      valueType.substitutions,

      new Set(),
    );

    if (unsafeValue !== null) {
      return { kind: "unsafe-dictionary", unsafeValue };
    }
  }

  return null;
}

export function classifyWideningTarget(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);

  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }

  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }

  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.some((member) => member.type === "TSIndexSignature")
      ? { kind: "open dictionary" }
      : unwrapped.members.length > 0
        ? { kind: "anonymous object" }
        : null;
  }

  if (unwrapped.type === "TSMappedType") {
    return { kind: "open dictionary" };
  }

  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);

  if (name === null) {
    return null;
  }

  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, unwrapped, environment)) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined ? null : classifyWideningTarget(wrapped, environment);
  }

  if (name === "Record" && isBuiltIn(name, unwrapped, environment)) {
    return hasBroadRecordKey(unwrapped, environment, new Map())
      ? { kind: "open dictionary" }
      : null;
  }

  const alias = visibleTypeAlias(name, unwrapped, environment);

  if (alias === null) {
    return null;
  }

  if ((alias.typeParameters?.params.length ?? 0) > 0) {
    const substitutions = aliasSubstitutions(alias, unwrapped, new Map(), new Set());

    const resolved =
      substitutions === null
        ? null
        : classifyAliasBroadTarget(
            alias.typeAnnotation,
            environment,
            substitutions,
            new Set([alias]),
          );

    return resolved?.kind === "open dictionary" ? { kind: "generic container" } : null;
  }

  const substitutions = aliasSubstitutions(alias, unwrapped, new Map(), new Set());

  if (substitutions === null) {
    return null;
  }

  const resolved = classifyAliasBroadTarget(
    alias.typeAnnotation,
    environment,
    substitutions,
    new Set([alias]),
  );

  return resolved;
}

function hasBroadRecordKey(
  type: ESTree.TSTypeReference,
  environment: TypeAliasEnvironment,
  substitutions: Substitutions,
): boolean {
  const key = type.typeArguments?.params[0];

  return key === undefined || isBroadMappedKey(key, environment, substitutions);
}

function isBroadMappedKey(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
  substitutions: Substitutions,
  visitedAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration> = new Set(),
): boolean {
  const unwrapped = unwrapTransparentType(type);

  if (
    unwrapped.type === "TSStringKeyword" ||
    unwrapped.type === "TSNumberKeyword" ||
    unwrapped.type === "TSSymbolKeyword"
  ) {
    return true;
  }

  if (unwrapped.type === "TSUnionType") {
    return unwrapped.types.some((member) =>
      isBroadMappedKey(member, environment, substitutions, visitedAliases),
    );
  }

  if (unwrapped.type !== "TSTypeReference") {
    return false;
  }

  const name = typeReferenceName(unwrapped);

  if (name === null) {
    return false;
  }

  const substitution = substitutions.get(name);

  if (substitution !== undefined) {
    return isBroadMappedKey(
      substitution.type,
      environment,
      substitution.substitutions,
      substitution.resolvingAliases,
    );
  }

  if (name === "PropertyKey" && isBuiltIn(name, unwrapped, environment)) {
    return true;
  }

  const alias = visibleTypeAlias(name, unwrapped, environment);

  if (
    alias === null ||
    (alias.typeParameters?.params.length ?? 0) > 0 ||
    visitedAliases.has(alias)
  ) {
    return false;
  }

  const nextVisited = new Set([...visitedAliases, alias]);

  return isBroadMappedKey(alias.typeAnnotation, environment, new Map(), nextVisited);
}

function classifyAliasBroadTarget(
  type: ESTree.TSType,
  environment: TypeAliasEnvironment,
  substitutions: Substitutions,
  resolvingAliases: ReadonlySet<ESTree.TSTypeAliasDeclaration>,
): WideningTarget | null {
  const unwrapped = unwrapTransparentType(type);

  if (unwrapped.type === "TSUnknownKeyword") {
    return { kind: "unknown" };
  }

  if (unwrapped.type === "TSObjectKeyword") {
    return { kind: "object" };
  }

  if (unwrapped.type === "TSTypeLiteral") {
    return unwrapped.members.some((member) => member.type === "TSIndexSignature")
      ? { kind: "open dictionary" }
      : null;
  }

  if (unwrapped.type === "TSMappedType") {
    return isBroadMappedKey(unwrapped.constraint, environment, substitutions)
      ? { kind: "open dictionary" }
      : null;
  }

  if (unwrapped.type !== "TSTypeReference") {
    return null;
  }

  const name = typeReferenceName(unwrapped);

  if (name === null) {
    return null;
  }

  const substitution = substitutions.get(name);

  if (substitution !== undefined) {
    return classifyAliasBroadTarget(
      substitution.type,
      environment,
      substitution.substitutions,
      substitution.resolvingAliases,
    );
  }

  if (TRANSPARENT_WRAPPERS.has(name) && isBuiltIn(name, unwrapped, environment)) {
    const wrapped = unwrapped.typeArguments?.params[0];

    return wrapped === undefined
      ? null
      : classifyAliasBroadTarget(wrapped, environment, substitutions, resolvingAliases);
  }

  if (name === "Record" && isBuiltIn(name, unwrapped, environment)) {
    return hasBroadRecordKey(unwrapped, environment, substitutions)
      ? { kind: "open dictionary" }
      : null;
  }

  const alias = visibleTypeAlias(name, unwrapped, environment);

  if (alias === null || resolvingAliases.has(alias)) {
    return null;
  }

  const nextSubstitutions = aliasSubstitutions(alias, unwrapped, substitutions, resolvingAliases);

  if (nextSubstitutions === null) {
    return null;
  }

  const nextResolving = new Set([...resolvingAliases, alias]);

  return classifyAliasBroadTarget(
    alias.typeAnnotation,
    environment,
    nextSubstitutions,
    nextResolving,
  );
}

export function isKnownEvidenceExpression(expression: ESTree.Expression): boolean {
  let current = expression;

  while (
    current.type === "ParenthesizedExpression" ||
    current.type === "TSAsExpression" ||
    current.type === "TSTypeAssertion" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSSatisfiesExpression"
  ) {
    current = current.expression;
  }

  if (current.type === "ObjectExpression") {
    return true;
  }

  return (
    current.type === "ArrayExpression" ||
    current.type === "ArrowFunctionExpression" ||
    current.type === "ClassExpression" ||
    current.type === "FunctionExpression" ||
    current.type === "NewExpression" ||
    current.type === "Literal" ||
    current.type === "TemplateLiteral" ||
    current.type === "UnaryExpression"
  );
}
