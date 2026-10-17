import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  { rules: {
    // This app does not use the React compiler. Effect-based synchronization is
    // intentional for its client-side authentication and persisted editor state.
    'react-hooks/set-state-in-effect':'off',
    'react-hooks/refs':'off',
  } },
  globalIgnores(['.next/**','node_modules/**','vendor/**','output/**','tmp/**','playwright-report/**','test-results/**']),
])
