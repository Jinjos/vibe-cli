/**
 * MCP Recommender - Improved version with better relevance and explanations
 * Last updated: January 2025
 * Archived servers excluded
 */
class MCPRecommender {
  constructor() {
    // Only include truly relevant MCP servers with clear tech stack mappings
    this.mcpRegistry = {
      // ESSENTIAL DEVELOPMENT SERVERS (only if universally needed)
      '@modelcontextprotocol/server-filesystem': {
        name: 'Filesystem',
        description: 'Secure file operations with configurable access controls',
        categories: ['essential', 'development'],
        techStack: ['*'], // Universal but essential
        priority: 'essential',
        repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        whyRecommended: 'Essential for any project - enables AI to read, write, and manage files'
      },
      '@modelcontextprotocol/server-git': {
        name: 'Git',
        description: 'Tools to read, search, and manipulate Git repositories',
        categories: ['optional', 'development', 'version-control'],
        techStack: ['git'], // Only if git detected
        priority: 'optional',
        repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
        whyRecommended: 'Git repository detected - enables AI to analyze commits, branches, and history'
      },

      // OPTIONAL DEVELOPMENT SERVERS (only if really useful)
      '@modelcontextprotocol/server-memory': {
        name: 'Memory',
        description: 'Knowledge graph-based persistent memory system',
        categories: ['utility', 'development'],
        techStack: ['complex-project'], // Only for complex projects
        priority: 'optional',
        repository: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
        whyRecommended: 'Useful for complex projects - maintains context across sessions'
      },

      // GITHUB INTEGRATION
      'github/github-mcp-server': {
        name: 'GitHub',
        description: 'GitHub\'s official MCP Server',
        categories: ['development', 'version-control'],
        techStack: ['github'], // Only if .github directory exists
        priority: 'essential',
        official: true,
        repository: 'https://github.com/github/github-mcp-server',
        whyRecommended: 'GitHub configuration detected - manage issues, PRs, and workflows'
      },

      // DATABASE SERVERS (only for detected databases)
      '@mongodb/mcp-server': {
        name: 'MongoDB',
        description: 'Official MongoDB MCP Server',
        categories: ['database', 'nosql'],
        techStack: ['mongodb', 'mongoose'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/mongodb-js/mongodb-mcp-server',
        whyRecommended: 'MongoDB detected - manage collections and documents'
      },
      '@redis/mcp-redis': {
        name: 'Redis',
        description: 'Official Redis MCP Server for data management',
        categories: ['database', 'cache'],
        techStack: ['redis', 'bull', 'cache'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/redis/mcp-redis/',
        whyRecommended: 'Redis detected - manage cache and key-value operations'
      },
      '@mariadb/mcp': {
        name: 'MariaDB',
        description: 'Standard SQL operations and vector search',
        categories: ['database'],
        techStack: ['mariadb', 'mysql'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/mariadb/mcp',
        whyRecommended: 'MySQL/MariaDB detected - execute queries and manage schemas'
      },
      '@elastic/mcp-server-elasticsearch': {
        name: 'Elasticsearch',
        description: 'Query your data in Elasticsearch',
        categories: ['database', 'search'],
        techStack: ['elasticsearch', 'elastic', 'opensearch'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/elastic/mcp-server-elasticsearch',
        whyRecommended: 'Elasticsearch detected - search and analyze your data'
      },
      '@clickhouse/mcp-server': {
        name: 'ClickHouse',
        description: 'Query your ClickHouse database server',
        categories: ['database', 'analytics'],
        techStack: ['clickhouse'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/ClickHouse/mcp-clickhouse',
        whyRecommended: 'ClickHouse detected - run analytics queries'
      },
      '@neo4j/mcp-server': {
        name: 'Neo4j',
        description: 'Neo4j graph database with cypher support',
        categories: ['database', 'graph'],
        techStack: ['neo4j', 'graph'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/neo4j-contrib/mcp-neo4j/',
        whyRecommended: 'Neo4j detected - query graph data with Cypher'
      },

      // CLOUD PROVIDERS (only if cloud services detected)
      '@aws/mcp-server': {
        name: 'AWS',
        description: 'AWS services integration',
        categories: ['cloud', 'aws'],
        techStack: ['aws', 's3', 'lambda', 'dynamodb', 'ec2'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/awslabs/mcp',
        whyRecommended: 'AWS services detected - manage cloud resources'
      },
      '@azure/mcp-server': {
        name: 'Azure',
        description: 'Azure services integration',
        categories: ['cloud', 'azure'],
        techStack: ['azure', 'cosmosdb', 'azurefunctions'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/Azure/azure-mcp',
        whyRecommended: 'Azure services detected - manage cloud resources'
      },
      '@cloudflare/mcp-server': {
        name: 'Cloudflare',
        description: 'Deploy and configure Cloudflare resources',
        categories: ['cloud', 'deployment'],
        techStack: ['cloudflare', 'workers', 'pages'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/cloudflare/mcp-server-cloudflare',
        whyRecommended: 'Cloudflare detected - manage edge deployments'
      },

      // DEPLOYMENT PLATFORMS (only if detected)
      '@vercel/mcp-server': {
        name: 'Vercel',
        description: 'Deployment automation for Next.js',
        categories: ['deployment', 'hosting'],
        techStack: ['nextjs', 'vercel'],
        priority: 'recommended',
        official: true,
        whyRecommended: 'Next.js/Vercel detected - automate deployments'
      },
      '@netlify/mcp-server': {
        name: 'Netlify',
        description: 'Build and deploy websites',
        categories: ['deployment', 'hosting'],
        techStack: ['netlify', 'gatsby', 'hugo'],
        priority: 'recommended',
        official: true,
        repository: 'https://docs.netlify.com/welcome/build-with-ai/netlify-mcp-server/',
        whyRecommended: 'Netlify configuration detected - manage deployments'
      },
      '@supabase/mcp-server': {
        name: 'Supabase',
        description: 'Manage Supabase backend services',
        categories: ['database', 'backend'],
        techStack: ['supabase'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/supabase-community/supabase-mcp',
        whyRecommended: 'Supabase detected - manage database and auth'
      },

      // FRONTEND BUILD TOOLS (only if detected)
      'blowback': {
        name: 'Blowback (Vite)',
        description: 'Frontend dev environment with browser automation',
        categories: ['build', 'frontend', 'development'],
        techStack: ['vite'],
        priority: 'optional',
        repository: 'https://github.com/ESnark/blowback',
        whyRecommended: 'Vite detected - integrate dev server with AI tools for visual inspection'
      },
      'mcpland/storybook-mcp': {
        name: 'Storybook',
        description: 'Component development and documentation',
        categories: ['frontend', 'documentation', 'testing'],
        techStack: ['storybook', '@storybook/'],
        priority: 'optional',
        repository: 'https://github.com/mcpland/storybook-mcp',
        whyRecommended: 'Storybook detected - manage component stories and documentation'
      },

      // TESTING & CI/CD (only if testing tools detected)
      'executeautomation/mcp-playwright': {
        name: 'Playwright',
        description: 'Browser automation and testing',
        categories: ['testing', 'e2e'],
        techStack: ['playwright', '@playwright/test'],
        priority: 'recommended',
        repository: 'https://github.com/executeautomation/mcp-playwright',
        whyRecommended: 'Playwright detected - automate browsers and APIs in AI tools'
      },
      '@browserstack/mcp-server': {
        name: 'BrowserStack',
        description: 'Cross-browser testing platform',
        categories: ['testing'],
        techStack: ['e2e', 'playwright', 'cypress', 'selenium'],
        priority: 'optional',
        official: true,
        repository: 'https://github.com/browserstack/mcp-server',
        whyRecommended: 'E2E testing detected - automate cross-browser tests'
      },

      // MONITORING (only if monitoring tools detected)
      '@datadog/mcp-server': {
        name: 'Datadog',
        description: 'Application monitoring and tracing',
        categories: ['monitoring', 'observability'],
        techStack: ['datadog'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/GeLi2001/datadog-mcp-server', 
        whyRecommended: 'Datadog detected - query metrics and traces'
      },
      '@grafana/mcp-grafana': {
        name: 'Grafana',
        description: 'Query dashboards and datasources',
        categories: ['monitoring', 'observability'],
        techStack: ['grafana', 'prometheus'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/grafana/mcp-grafana',
        whyRecommended: 'Grafana detected - analyze dashboards and metrics'
      },

      // MONOREPO TOOLS (only if monorepo detected)
      '@nx/mcp-server': {
        name: 'Nx',
        description: 'Nx monorepo understanding for LLMs',
        categories: ['build', 'monorepo'],
        techStack: ['nx'],
        priority: 'essential',
        official: true,
        repository: 'https://github.com/nrwl/nx-console/blob/master/apps/nx-mcp',
        whyRecommended: 'Nx monorepo detected - understand workspace structure'
      },

      // SECURITY (only if security tools detected)
      '@semgrep/mcp': {
        name: 'Semgrep',
        description: 'Secure code with static analysis',
        categories: ['security', 'code-quality'],
        techStack: ['semgrep'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/semgrep/mcp',
        whyRecommended: 'Security scanning needed - find vulnerabilities'
      },
      '@snyk/mcp-server': {
        name: 'Snyk',
        description: 'Vulnerability scanning',
        categories: ['security'],
        techStack: ['snyk'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/snyk/snyk-ls/blob/main/mcp_extension/README.md',
        whyRecommended: 'Dependency scanning needed - find vulnerabilities'
      },

      // ANALYTICS (only if analytics detected)
      '@posthog/mcp': {
        name: 'PostHog',
        description: 'Product analytics and feature flags',
        categories: ['analytics', 'monitoring'],
        techStack: ['posthog'],
        priority: 'optional',
        official: true,
        repository: 'https://github.com/posthog/mcp',
        whyRecommended: 'PostHog detected - query analytics data'
      },

      // INFRASTRUCTURE (only if IaC detected)
      '@terraform/mcp-server': {
        name: 'Terraform',
        description: 'Infrastructure as Code development',
        categories: ['devops', 'infrastructure'],
        techStack: ['terraform', 'tf', 'hcl'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/hashicorp/terraform-mcp-server',
        whyRecommended: 'Terraform detected - manage infrastructure'
      },

      // STREAMING (only if streaming platforms detected)
      '@confluentinc/mcp-confluent': {
        name: 'Confluent',
        description: 'Kafka and streaming platform',
        categories: ['streaming', 'kafka'],
        techStack: ['kafka', 'confluent'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/confluentinc/mcp-confluent',
        whyRecommended: 'Kafka detected - manage topics and schemas'
      },

      // API DEVELOPMENT (only if API tools detected)
      'brizzai/auto-mcp': {
        name: 'OpenAPI/Swagger',
        description: 'Transform OpenAPI specs into MCP servers',
        categories: ['api', 'documentation'],
        techStack: ['swagger', 'openapi', 'swagger-ui', '@swagger/'],
        priority: 'recommended',
        repository: 'https://github.com/brizzai/auto-mcp',
        whyRecommended: 'OpenAPI/Swagger detected - auto-generate MCP server from API specs'
      },

      // CONTAINERIZATION (only if docker detected)
      'docker/mcp-servers': {
        name: 'Docker',
        description: 'Container and compose stack management',
        categories: ['containerization', 'devops'],
        techStack: ['docker', 'dockerfile', 'docker-compose'],
        priority: 'recommended',
        official: true,
        repository: 'https://github.com/docker/mcp-servers',
        whyRecommended: 'Docker detected - manage containers, images, and compose stacks'
      }
    };

    // Patterns that indicate complex projects
    this.complexProjectIndicators = [
      'microservices',
      'monorepo',
      'enterprise',
      'large-scale'
    ];
  }

  /**
   * Recommend MCP servers based on tech stack with detailed explanations
   */
  async recommend(techStack) {
    const recommendations = [];
    const addedServers = new Set();

    // Get all tech patterns
    const allTech = this.extractAllTech(techStack);
    const normalizedTech = allTech.map(t => t.toLowerCase());

    // Check for complex project indicators
    if (this.isComplexProject(techStack)) {
      normalizedTech.push('complex-project');
    }

    // Check for GitHub
    if (techStack.deployment.includes('github-actions') || techStack.patterns.includes('.github')) {
      normalizedTech.push('github');
    }

    // Check for git
    if (techStack.versionControl && techStack.versionControl.includes('git')) {
      normalizedTech.push('git');
    }

    // Check each MCP server
    for (const [packageName, server] of Object.entries(this.mcpRegistry)) {
      const matchResult = this.shouldRecommend(server, normalizedTech, techStack);
      
      if (matchResult.recommend) {
        if (!addedServers.has(packageName)) {
          recommendations.push({
            package: packageName,
            name: server.name,
            description: server.description,
            priority: server.priority,
            categories: server.categories,
            reason: matchResult.reason || server.whyRecommended,
            installCommand: this.getInstallCommand(packageName, server),
            repository: server.repository,
            official: server.official || false
          });
          addedServers.add(packageName);
        }
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { essential: 1, recommended: 2, optional: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return recommendations;
  }

  /**
   * Extract all technology identifiers from tech stack
   */
  extractAllTech(techStack) {
    const tech = [
      ...(techStack.languages || []),
      ...(techStack.frameworks || []),
      ...(techStack.databases || []),
      ...(techStack.testing || []),
      ...(techStack.buildTools || []),
      ...(techStack.deployment || []),
      ...(techStack.patterns || []),
      ...(techStack.architecture?.patterns || [])
    ];

    // Only add these if they actually exist in techStack
    if (techStack.monitoring && Array.isArray(techStack.monitoring)) {
      tech.push(...techStack.monitoring);
    }
    if (techStack.analytics && Array.isArray(techStack.analytics)) {
      tech.push(...techStack.analytics);
    }
    if (techStack.security && Array.isArray(techStack.security)) {
      tech.push(...techStack.security);
    }
    if (techStack.infrastructure && Array.isArray(techStack.infrastructure)) {
      tech.push(...techStack.infrastructure);
    }

    // Add file-based detections only if files exist
    if (techStack.files && typeof techStack.files === 'object') {
      if (techStack.files['.terraformrc'] || techStack.files['terraform.tf'] || techStack.files['main.tf']) {
        tech.push('terraform');
      }
      if (techStack.files['vercel.json']) {
        tech.push('vercel');
      }
      if (techStack.files['netlify.toml']) {
        tech.push('netlify');
      }
      if (techStack.files['.snyk']) {
        tech.push('snyk');
      }
      if (techStack.files['datadog.yaml'] || techStack.files['.datadog']) {
        tech.push('datadog');
      }
      if (techStack.files['grafana.ini'] || techStack.files['.grafana']) {
        tech.push('grafana');
      }
    }

    return [...new Set(tech)];
  }

  /**
   * Check if project is complex enough to benefit from certain tools
   */
  isComplexProject(techStack) {
    // Multiple databases
    if (techStack.databases.length > 1) return true;
    
    // Microservices or monorepo
    if (techStack.architecture?.patterns?.some(p => 
      this.complexProjectIndicators.includes(p.toLowerCase())
    )) return true;
    
    // Large number of dependencies
    if (techStack.frameworks.length + techStack.databases.length > 5) return true;
    
    return false;
  }

  /**
   * Determine if a server should be recommended with specific reason
   */
  shouldRecommend(server, techStack, fullTechStack) {
    // For universal servers, be more selective
    if (server.techStack.includes('*')) {
      // Only recommend filesystem for all projects
      if (server.name === 'Filesystem') {
        return { recommend: true, reason: server.whyRecommended };
      }
      
      // Skip other universal servers unless they're truly relevant
      return { recommend: false };
    }

    // For monitoring/infrastructure servers, require explicit evidence
    if (server.categories.includes('monitoring') || server.categories.includes('observability')) {
      const hasExplicitMonitoring = this.hasExplicitTechEvidence(server, fullTechStack);
      if (!hasExplicitMonitoring) {
        return { recommend: false };
      }
    }

    if (server.categories.includes('devops') || server.categories.includes('infrastructure')) {
      const hasExplicitInfrastructure = this.hasExplicitTechEvidence(server, fullTechStack);
      if (!hasExplicitInfrastructure) {
        return { recommend: false };
      }
    }

    // Check for exact matches
    for (const tech of server.techStack) {
      if (techStack.includes(tech.toLowerCase())) {
        const specificReason = this.getSpecificReason(server, tech, fullTechStack);
        return { recommend: true, reason: specificReason };
      }
    }

    // Check for related technologies
    for (const tech of server.techStack) {
      const related = this.findRelatedTech(tech, techStack);
      if (related) {
        return { 
          recommend: true, 
          reason: `${this.formatTech(related)} detected - ${server.name} provides compatible integration`
        };
      }
    }

    return { recommend: false };
  }

  /**
   * Check for explicit evidence of technology usage (config files, dependencies, etc.)
   */
  hasExplicitTechEvidence(server, fullTechStack) {
    // Check server's tech stack against explicit evidence
    for (const tech of server.techStack) {
      const lowerTech = tech.toLowerCase();
      
      // Check dependencies in package.json
      if (fullTechStack.dependencies && fullTechStack.dependencies.some(dep => 
        dep.toLowerCase().includes(lowerTech)
      )) {
        return true;
      }
      
      // Check for configuration files
      if (fullTechStack.configFiles && fullTechStack.configFiles.some(file => 
        file.toLowerCase().includes(lowerTech)
      )) {
        return true;
      }
      
      // Check for explicit file patterns
      if (fullTechStack.files) {
        const explicitFiles = {
          'datadog': ['datadog.yaml', '.datadog', 'datadog.json'],
          'grafana': ['grafana.ini', 'grafana.yaml', '.grafana'],
          'terraform': ['*.tf', 'terraform.tfvars', '.terraform/'],
          'prometheus': ['prometheus.yml', 'prometheus.yaml'],
          'docker': ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
          'kubernetes': ['*.yaml', '*.yml'],
          'aws': ['.aws/', 'aws-cli/', 'cloudformation.yaml'],
          'azure': ['.azure/', 'azure-pipelines.yml'],
          'gcp': ['.gcp/', 'cloudbuild.yaml']
        };
        
        const patterns = explicitFiles[lowerTech];
        if (patterns && patterns.some(pattern => {
          return Object.keys(fullTechStack.files).some(file => {
            if (pattern.includes('*')) {
              return file.includes(pattern.replace('*', ''));
            }
            return file.includes(pattern);
          });
        })) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get specific reason for recommendation based on exact tech match
   */
  getSpecificReason(server, matchedTech) {
    // Use predefined reason if available
    if (server.whyRecommended) {
      return server.whyRecommended;
    }

    // Generate specific reasons based on category
    if (server.categories.includes('database')) {
      return `${this.formatTech(matchedTech)} database detected - enables AI to query data and manage schemas`;
    }
    
    if (server.categories.includes('cloud')) {
      return `${this.formatTech(matchedTech)} cloud services detected - manage infrastructure and deployments`;
    }
    
    if (server.categories.includes('monitoring')) {
      return `${this.formatTech(matchedTech)} monitoring detected - query metrics and analyze performance`;
    }
    
    if (server.categories.includes('testing')) {
      return `Testing framework detected - automate test execution and analysis`;
    }

    return `${this.formatTech(matchedTech)} detected in your project`;
  }

  /**
   * Find related technologies with better matching
   */
  findRelatedTech(serverTech, projectTech) {
    const relations = {
      'postgresql': ['postgres', 'pg', 'pgadmin', 'prisma'],
      'postgres': ['postgresql', 'pg', 'pgadmin', 'prisma'],
      'mysql': ['mariadb', 'sequelize'],
      'mariadb': ['mysql', 'sequelize'],
      'mongodb': ['mongoose', 'mongo'],
      'elasticsearch': ['elastic', 'opensearch', 'kibana'],
      'redis': ['bull', 'cache', 'ioredis'],
      'aws': ['s3', 'lambda', 'dynamodb', 'ec2', 'cloudformation'],
      'azure': ['cosmosdb', 'azurefunctions'],
      'kafka': ['kafkajs', 'confluent'],
      'nextjs': ['next', 'vercel'],
      'terraform': ['tf', 'hcl', 'terragrunt']
    };

    const related = relations[serverTech.toLowerCase()] || [];
    return projectTech.find(tech => related.includes(tech));
  }

  /**
   * Format technology names
   */
  formatTech(tech) {
    const names = {
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'mysql': 'MySQL',
      'mariadb': 'MariaDB',
      'redis': 'Redis',
      'elasticsearch': 'Elasticsearch',
      'neo4j': 'Neo4j',
      'clickhouse': 'ClickHouse',
      'aws': 'AWS',
      'azure': 'Azure',
      'nextjs': 'Next.js',
      'terraform': 'Terraform',
      'kafka': 'Kafka',
      'github': 'GitHub'
    };
    return names[tech.toLowerCase()] || tech;
  }

  /**
   * Get install command based on package name and server info
   */
  getInstallCommand(packageName, server) {
    if (packageName.startsWith('@') && !server.repository) {
      return `npm install -g ${packageName}`;
    }
    
    if (server.repository) {
      return `Details at: ${server.repository}`;
    }
    
    return `Check MCP registry for installation`;
  }
}

module.exports = { MCPRecommender };
