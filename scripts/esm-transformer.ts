import * as ts from 'typescript'

import * as fs from 'node:fs'
import { dirname, join, resolve } from 'node:path'

type LoadedFile = {
  path: string
  content: Buffer
}

function resolveImport(mod: string, source: string) {
  if (mod.endsWith('.js')) {
    return mod
  }
  if (mod.startsWith('@') && mod.split('/').length < 3) {
    return mod
  }
  if (!mod.startsWith('.') && !mod.includes('/')) {
    return mod
  }

  if (!mod.startsWith('.')) {
    return `${mod}${
      require.resolve(mod, { paths: [process.cwd()] }).split(mod)[1]
    }`
  }

  const potentialPaths = [
    mod,
    `${mod}.ts`,
    `${mod}.d.ts`,
    `${mod}.js`,
    `${mod}/index.ts`,
    `${mod}/index.d.ts`,
    `${mod}/index.js`,
  ]

  for (const candidate of potentialPaths) {
    const resolved = resolve(dirname(source), candidate)
    if (fs.existsSync(resolved) && !fs.statSync(resolved).isDirectory()) {
      return candidate.replace(/(?:\.d\)?\.ts)$/, '.js')
    }
  }

  throw new Error(`Module not found ${mod} from ${source}`)
}

const importTransformer = (context) => {
  return (sourceFile) => {
    const visitor = (node: ts.Node): ts.Node => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const { moduleSpecifier } = node
        if (moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)) {
          const mod = resolveImport(moduleSpecifier.text, sourceFile.fileName)

          if (ts.isImportDeclaration(node)) {
            const updated = ts.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              ts.factory.createStringLiteral(mod, true),
              undefined,
            )

            return ts.visitEachChild(updated, visitor, context)
          }

          const updatedNode = ts.factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            ts.factory.createStringLiteral(mod, true),
            undefined,
          )

          return ts.visitEachChild(updatedNode, visitor, context)
        }
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteralLike(node.argument.literal)
      ) {
        const mod = resolveImport(
          node.argument.literal.text,
          sourceFile.fileName,
        )

        const updatedNode = ts.factory.updateImportTypeNode(
          node,
          ts.factory.updateLiteralTypeNode(
            node.argument,
            ts.factory.createStringLiteral(mod),
          ),
          node.attributes,
          node.qualifier,
          node.typeArguments,
        )

        return ts.visitEachChild(updatedNode, visitor, context)
      }

      return ts.visitEachChild(node, visitor, context)
    }

    return ts.visitNode(sourceFile, visitor)
  }
}

function getFiles(dir: string): string[] {
  const results = fs.readdirSync(dir, {
    withFileTypes: true,
  })

  const paths = results.map((entry): string[] => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return getFiles(fullPath)
    }

    return fullPath.endsWith('.js') || fullPath.endsWith('.d.ts')
      ? [fullPath]
      : []
  })

  return paths.flat()
}

function loadFile(file: string): LoadedFile {
  const printer = ts.createPrinter()

  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf-8'),
    ts.ScriptTarget.ESNext,
  )
  const result = ts.transform(source, [importTransformer])

  return {
    path: file,
    content: Buffer.from(printer.printFile(result.transformed[0]), 'utf8'),
  }
}

function getAllFiles() {
  return getFiles(join(process.cwd(), 'esm')).map((entry) => loadFile(entry))
}

function build() {
  const files = getAllFiles()

  return files.map((file) => {
    fs.writeFileSync(file.path, file.content)
  })
}

build()
