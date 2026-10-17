// Shared vocabulary and boundary-aware matching for ATS and AI grounding.
export function keywordPresent(text: string, keyword: string): boolean {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  return Boolean(escaped) && new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`,'iu').test(text)
}

export const KEYWORD_TERMS = new Set([
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'golang',
    'rust', 'scala', 'kotlin', 'swift', 'php', 'perl', 'r', 'sql', 'nosql',
    'react', 'angular', 'vue', 'svelte', 'nextjs', 'next.js', 'nodejs', 'node.js',
    'express', 'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'jenkins', 'gitlab', 'github', 'bitbucket', 'jira', 'confluence',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'kafka', 'rabbitmq',
    'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'webpack', 'vite',
    'git', 'linux', 'unix', 'bash', 'shell', 'api', 'apis', 'microservices',
    'agile', 'scrum', 'kanban', 'lean', 'waterfall',
    'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'scikit-learn',
    'hadoop', 'spark', 'airflow', 'dbt', 'snowflake', 'databricks',
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
    'leadership', 'communication', 'collaboration', 'problem-solving',
    'analytical', 'strategic', 'innovative', 'detail-oriented',
])
