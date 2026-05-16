import ts from 'typescript';

const ANGULAR_TYPE_PATH_PATTERNS = [
    'node_modules/@angular/core',
    'node_modules/@angular/core/rxjs-interop',
];

const SIGNAL_TYPE_NAME_PATTERN = /\b[A-Za-z]*Signal(?:WithTransform)?(?:<|$)/;

function getPropertyName(node) {
    if (node.key?.type === 'Identifier') {
        return node.key.name;
    }

    if (node.key?.type === 'Literal' && typeof node.key.value === 'string') {
        return node.key.value;
    }

    return null;
}

function normalizeFileName(fileName) {
    return fileName.replaceAll('\\', '/').toLowerCase();
}

function hasAngularDeclaration(symbol) {
    if (!symbol) {
        return false;
    }

    return (symbol.getDeclarations() ?? []).some((declaration) => {
        const fileName = normalizeFileName(declaration.getSourceFile().fileName);
        return ANGULAR_TYPE_PATH_PATTERNS.some((pattern) => fileName.includes(pattern));
    });
}

function isSignalTypeName(typeName) {
    return SIGNAL_TYPE_NAME_PATTERN.test(typeName);
}

function isAngularSignalType(type, checker, visited = new Set()) {
    if (!type || visited.has(type)) {
        return false;
    }

    visited.add(type);

    const typeName = checker.typeToString(type);
    if (isSignalTypeName(typeName)) {
        return true;
    }

    if (type.flags & ts.TypeFlags.Union) {
        return type.types.some((part) => isAngularSignalType(part, checker, visited));
    }

    if (type.flags & ts.TypeFlags.Intersection) {
        return type.types.some((part) => isAngularSignalType(part, checker, visited));
    }

    const symbol = type.aliasSymbol ?? type.getSymbol();
    if (symbol && hasAngularDeclaration(symbol) && isSignalTypeName(symbol.getName())) {
        return true;
    }

    if (type.aliasTypeArguments?.some((part) => isAngularSignalType(part, checker, visited))) {
        return true;
    }

    const baseTypes = type.getBaseTypes?.() ?? [];
    if (baseTypes.some((part) => isAngularSignalType(part, checker, visited))) {
        return true;
    }

    const apparentType = checker.getApparentType(type);
    if (apparentType !== type && isAngularSignalType(apparentType, checker, visited)) {
        return true;
    }

    return false;
}

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require Angular signal-valued class properties to start with a $ prefix.',
            requiresTypeChecking: true,
        },
        schema: [],
        messages: {
            missingPrefix: 'Signal-valued property "{{name}}" must start with "$".',
        },
    },
    create(context) {
        const parserServices = {
            ...(context.parserServices ?? {}),
            ...(context.sourceCode.parserServices ?? {}),
        };
        const program = parserServices?.program;

        if (!program || !parserServices?.esTreeNodeToTSNodeMap) {
            return {};
        }

        const checker = program.getTypeChecker();

        return {
            PropertyDefinition(node) {
                const propertyName = getPropertyName(node);
                if (!propertyName || propertyName.startsWith('$') || !node.value) {
                    return;
                }

                const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.value);
                const type = checker.getTypeAtLocation(tsNode);
                const isSignal = isAngularSignalType(type, checker);

                if (!isSignal) {
                    return;
                }

                context.report({
                    node: node.key,
                    messageId: 'missingPrefix',
                    data: {
                        name: propertyName,
                    },
                });
            },
        };
    },
};
