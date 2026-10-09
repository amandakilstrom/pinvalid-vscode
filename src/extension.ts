import * as vscode from 'vscode';
import { parse } from 'smol-toml';

const diagnostics = vscode.languages.createDiagnosticCollection('pinvalid');

function checkDocument(doc: vscode.TextDocument) {
	if (!doc.fileName.endsWith('project.toml')) {
		return;
	}

	const found: vscode.Diagnostic[] = [];

	try {
		const data = parse(doc.getText()) as { pin?: { name: string; function: string }[] };
		const seen = new Map<string, number>();
	
		for (const pin of data.pin ?? []) {
			seen.set(pin.name, (seen.get(pin.name) ?? 0) + 1);
		}

		const lines = doc.getText().split('\n');
		lines.forEach((line, i) => {
			for (const [name, count] of seen) {
				if (count > 1 && line.includes(`"${name}"`)) {
					found.push(new vscode.Diagnostic(
						new vscode.Range(i, 0, i, line.length),
						`Pin ${name} is defined ${count} times`,
						vscode.DiagnosticSeverity.Error
					));
				}
			}
		});

	} catch (error) {
		console.error('Error parsing TOML:', error);
		found.push(new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 1),
			`Error parsing TOML: ${error}`,
			vscode.DiagnosticSeverity.Error
		));
	}

	diagnostics.set(doc.uri, found);
}

export function activate(context: vscode.ExtensionContext) {

	// console.log('Pinvalid is now active');

	context.subscriptions.push(
		diagnostics,
		vscode.commands.registerCommand('pinvalid-vscode.checkPins', () => {
			const doc = vscode.window.activeTextEditor?.document;
			if (doc) {
				checkDocument(doc);
			}
		}),
		vscode.workspace.onDidOpenTextDocument(checkDocument),
		vscode.workspace.onDidSaveTextDocument(checkDocument)
	);

	vscode.workspace.textDocuments.forEach(checkDocument);
}

export function deactivate() {}
