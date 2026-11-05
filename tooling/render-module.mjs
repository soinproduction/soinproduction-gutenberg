import {resolveBlock} from './block-paths.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {buildSync} from 'esbuild';

const project = process.cwd();
const quote = JSON.stringify;

export function loadSchema(file) {
    const source = `import {schema} from ${quote(file)};import {validateFields} from ${quote(
        path.join(project, 'kit/core/fields/schema.ts')
    )};export default validateFields(schema);`;
    const result = buildSync({
        stdin: {contents: source, resolveDir: project, loader: 'ts'},
        bundle: true,
        write: false,
        platform: 'node',
        format: 'cjs',
        packages: 'external',
        tsconfig: path.join(project, 'tsconfig.json'),
        alias: {'@': path.join(project, 'src')},
    });
    const module = {exports: {}};
    new Function('module', 'exports', 'require', result.outputFiles[0].text)(
        module,
        module.exports,
        createRequire(import.meta.url)
    );
    return module.exports.default;
}

export function generateMarkup(schema, slug, kind = 'section') {
    const imports = new Set();
    const nodes = (fields, depth = 1) =>
        fields
            .map((field) => {
                const pad = '  '.repeat(depth),
                    name = quote(field.name);
                if (field.scaffold === false) return '';
                if (field.type === 'content') {
                    imports.add('ContentArea');
                    return `${pad}<ContentArea name={${name}} className="space-y-6">\n${pad}  {(content) => (\n${pad}    <>\n${pad}      {content}\n${pad}    </>\n${pad}  )}\n${pad}</ContentArea>`;
                }
                if (field.type === 'repeater' || field.type === 'group') {
                    const component = field.type === 'repeater' ? 'Repeater' : 'Group';
                    imports.add(component);
                    const item =
                        field.type === 'repeater'
                            ? '\n' +
                            pad +
                            '  <article className="space-y-4">\n' +
                            nodes(field.fields ?? [], depth + 2) +
                            '\n' +
                            pad +
                            '  </article>'
                            : '\n' + nodes(field.fields ?? [], depth + 1);
                    return `${pad}<${component} name={${name}} className="${
                        field.type === 'repeater' ? 'grid gap-6 for-small-tablet:grid-cols-3' : 'space-y-4'
                    }">${item}\n${pad}</${component}>`;
                }
                if (field.type === 'relationship') {
                    for (const name of [
                        'Relationship',
                        'RecordImage',
                        'RecordTitle',
                        'RecordExcerpt',
                        'RecordLink',
                    ])
                        imports.add(name);
                    return `${pad}<Relationship name={${name}} className="grid gap-6 for-small-tablet:grid-cols-3">\n${pad}  <article className="space-y-4">\n${pad}    <RecordImage className="aspect-[4/3] w-full object-cover" />\n${pad}    <RecordTitle className="text-xl" />\n${pad}    <RecordExcerpt />\n${pad}    <RecordLink className="underline">Read more</RecordLink>\n${pad}  </article>\n${pad}</Relationship>`;
                }
                imports.add('Field');
                const as = field.tag ?? (field.type === 'richText' ? 'h2' : undefined);
                const style =
                    field.type === 'richText'
                        ? 'text-3xl'
                        : field.type === 'image'
                            ? 'aspect-[4/3] w-full object-cover'
                            : field.type === 'wysiwyg'
                                ? 'space-y-4 leading-relaxed'
                                : field.type === 'buttons'
                                    ? 'flex flex-wrap gap-3'
                                    : undefined;
                return `${pad}<Field name={${name}}${as ? ' as=' + quote(as) : ''}${
                    style ? ' className=' + quote(style) : ''
                } />`;
            })
            .join('\n');
    const body = nodes(schema, 2),
        tag = kind === 'component' ? 'article' : kind === 'layout' ? 'div' : 'section';
    return `'use client';\nimport { ${[...imports].join(', ')} } from '@kit/core/fields/render';\n${
        kind === 'section' ? "import {useSectionAnchor} from '@kit/core/modules/section';\n" : ''
    }export function Component() {\n${
        kind === 'section' ? '  const sectionAnchor=useSectionAnchor();\n' : ''
    }  return (\n    <${tag}${
        kind === 'section' ? ' id={sectionAnchor}' : ''
    } className="module-${slug} mx-auto max-w-7xl space-y-8 px-6 py-20">\n${body}\n    </${tag}>\n  );\n}\n`;
}

export function renderModule(root, slug, {build = true, force = false, stdout = false} = {}) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug ?? ''))
        throw new Error('Use a lowercase module name.');
    const directory = resolveBlock(root, slug),
        file = path.join(directory, 'schema.ts');
    if (!fs.existsSync(file))
        throw new Error(`No schema.ts in ${slug}. Only schema-based modules support this command.`);
    const registration = fs.readFileSync(path.join(directory, 'register.php'), 'utf8');
    const kind = /'kind'\s*=>\s*'(component|layout)'/.exec(registration)?.[1] ?? 'section';
    const markup = generateMarkup(loadSchema(file), slug, kind);
    if (stdout) return markup;
    const output = path.join(directory, 'component.tsx'),
        previous = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : null;
    const hash = (text) => createHash('sha256').update(text).digest('hex');
    const owned = previous?.match(/^\/\/ Generated layout sha256:([a-f0-9]+)\n([\s\S]*)$/);
    if (previous !== null && !force && (!owned || hash(owned[2]) !== owned[1]))
        throw new Error(
            'component.tsx has a custom layout. Use --stdout to view the proposed JSX, or --force to replace it explicitly.'
        );
    try {
        fs.writeFileSync(output, '// Generated layout sha256:' + hash(markup) + '\n' + markup);
        if (build) execFileSync('npm', ['run', 'build:editor'], {cwd: root, stdio: 'inherit'});
    } catch (error) {
        if (previous === null) fs.rmSync(output, {force: true});
        else fs.writeFileSync(output, previous);
        throw error;
    }
    return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const options = {
            force: process.argv.includes('--force'),
            stdout: process.argv.includes('--stdout'),
        };
        const result = renderModule(project, process.argv[2], options);
        console.log(
            options.stdout
                ? result
                : 'Generated ' + result + '\nRefresh Gutenberg to load the updated editor.'
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
