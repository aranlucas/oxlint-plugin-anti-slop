import { defineRule } from "@oxlint/plugins";
import type { ESTree, SourceCode } from "@oxlint/plugins";

import { resolveVariable } from "../shared/scope.ts";

type RejectionHandler = ESTree.ArrowFunctionExpression | ESTree.Function;

function rejectionArgument(node: ESTree.CallExpression): ESTree.Argument | undefined {
  const callee = node.callee;

  if (callee.type !== "MemberExpression") {
    return undefined;
  }

  const property = callee.property;

  const name = callee.computed
    ? property.type === "Literal" && property.value
    : property.type === "Identifier" && property.name;

  return name === "catch" ? node.arguments[0] : name === "then" ? node.arguments[1] : undefined;
}

function rejectionHandler(node: ESTree.CallExpression): RejectionHandler | null {
  const handler = rejectionArgument(node);

  if (handler?.type === "ArrowFunctionExpression" || handler?.type === "FunctionExpression") {
    return handler;
  }

  return null;
}

function returnsUndefined(sourceCode: SourceCode, node: ESTree.Expression): boolean {
  if (node.type === "Identifier" && node.name === "undefined") {
    const variable = resolveVariable(sourceCode, node);

    return variable === null || variable.defs.length === 0;
  }

  return (
    node.type === "UnaryExpression" && node.operator === "void" && node.argument.type === "Literal"
  );
}

function discardsFailure(sourceCode: SourceCode, handler: RejectionHandler): boolean {
  const body = handler.body;

  if (body === null) {
    return false;
  }

  if (body.type !== "BlockStatement") {
    return returnsUndefined(sourceCode, body);
  }

  return body.body.every((statement) => {
    if (statement.type === "EmptyStatement") {
      return true;
    }

    return (
      statement.type === "ReturnStatement" &&
      (statement.argument === null || returnsUndefined(sourceCode, statement.argument))
    );
  });
}

/** Require handling or an explanation when an inline rejection handler discards a failure. */
export const noSilentPromiseCatchRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow unexplained no-op catch callbacks and then rejection callbacks.",
    },
    schema: [],
    messages: {
      silentCatch:
        "This rejection handler silently discards the failure. Recover, report, or rethrow it; if suppression is intentional, explain why in a comment inside the handler.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const handler = rejectionHandler(node);

        if (handler === null || !discardsFailure(context.sourceCode, handler)) {
          return;
        }

        const explained = context.sourceCode
          .getCommentsInside(handler)
          .some((comment) => comment.value.trim().length > 0);

        if (!explained) {
          context.report({ node: handler, messageId: "silentCatch" });
        }
      },
    };
  },
});
