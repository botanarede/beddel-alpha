
import { describe, it, expect } from 'vitest';
import { loadYaml } from '../src/core/parser';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

describe('YAML Parser', () => {
    it('should load YAML from file', async () => {
        const tempFile = join(process.cwd(), 'temp_test_agent.yaml');
        const content = `
metadata:
  name: "File Agent"
  version: "1.0.0"
workflow: []
`;
        await writeFile(tempFile, content);

        try {
            const result = await loadYaml(tempFile);
            expect(result.metadata.name).toBe("File Agent");
        } finally {
            await unlink(tempFile);
        }
    });

    it('should fail on unsafe YAML types (FAILSAFE_SCHEMA)', async () => {
         const tempFile = join(process.cwd(), 'unsafe_agent.yaml');
         const content = `
unsafe: !!js/function >
  function() { return "hacked"; }
`;
         await writeFile(tempFile, content);

         try {
             // loadYaml uses FAILSAFE_SCHEMA, which treats unknown tags as errors or strings depending on strictness.
             // But more importantly, it should NOT execute code.
             // If js-yaml throws on the tag, that's good.
             await expect(loadYaml(tempFile)).rejects.toThrow();
         } finally {
             await unlink(tempFile);
         }
    });
});
