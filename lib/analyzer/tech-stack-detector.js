const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const { Logger } = require('../utils/logger');
/**
 * Enhanced Tech Stack Detector with comprehensive detection strategies
 */
class TechStackDetector {
  constructor(options = {}) {
    // Initialize all detectors
    this.initializeDetectors();
    this.logger = Logger({ mcpMode: options.mcpMode });
  }

  /**
   * Initialize all detection patterns and strategies
   */
  initializeDetectors() {
    // Language detectors with confidence scoring
    this.languageDetectors = {
      javascript: {
        patterns: ['*.js', '*.mjs', '*.cjs'],
        configs: ['package.json', '.npmrc'],
        requiredForConfidence: ['package.json'],
        confidence: (evidence) => {
          if (evidence.configs.includes('package.json')) return 1.0;
          return evidence.files.length > 0 ? 0.8 : 0;
        }
      },
      
      typescript: {
        patterns: ['*.ts', '*.tsx', '*.d.ts'],
        configs: ['tsconfig.json', 'tsconfig.*.json'],
        packageIndicators: ['typescript', '@types/'],
        confidence: (evidence) => {
          if (evidence.configs.includes('tsconfig.json')) return 1.0;
          if (evidence.packageIndicators.length > 0) return 0.9;
          return evidence.files.length > 0 ? 0.7 : 0;
        }
      },
      
      python: {
        patterns: ['*.py'],
        configs: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
        indicators: ['__init__.py', 'manage.py'],
        confidence: (evidence) => {
          if (evidence.configs.length > 0) return 1.0;
          if (evidence.indicators.includes('manage.py')) return 0.95;
          return evidence.files.length > 5 ? 0.8 : 0.6;
        }
      },
      
      java: {
        patterns: ['*.java'],
        configs: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
        projectFiles: ['.classpath', '.project'],
        confidence: (evidence) => {
          if (evidence.configs.length > 0) return 1.0;
          return evidence.files.length > 0 ? 0.5 : 0;
        }
      },
      
      go: {
        patterns: ['*.go'],
        configs: ['go.mod', 'go.sum'],
        confidence: (evidence) => {
          if (evidence.configs.includes('go.mod')) return 1.0;
          return evidence.files.length > 0 ? 0.6 : 0;
        }
      }
    };

    // Frontend framework detectors
    this.frontendDetectors = {
      react: {
        dependencies: ['react', 'react-dom'],
        devDependencies: ['@types/react', '@testing-library/react'],
        files: ['*.jsx', '*.tsx'],
        componentPatterns: ['React.Component', 'useState', 'useEffect', 'jsx'],
        exclusiveWith: ['vue', 'angular', 'svelte'],
        confidence: (evidence) => {
          if (!evidence.isBackendOnly && evidence.dependencies.includes('react')) return 1.0;
          if (!evidence.isBackendOnly && evidence.dependencies.includes('react-dom')) return 0.95;
          if (evidence.isBackendOnly) return 0; // Backend project shouldn't have React
          return 0;
        }
      },
      
      vue: {
        dependencies: ['vue', 'vue@2', 'vue@3'],
        files: ['*.vue'],
        configs: ['vue.config.js', 'vite.config.js'],
        indicators: ['components/', 'views/'],
        exclusiveWith: ['react', 'angular', 'svelte'],
        confidence: (evidence) => {
          if (evidence.dependencies.some(d => d.startsWith('vue'))) return 1.0;
          if (evidence.files.length > 0) return 0.9;
          return 0;
        }
      },
      
      angular: {
        dependencies: ['@angular/core', '@angular/common'],
        files: ['*.component.ts', '*.module.ts', '*.service.ts'],
        configs: ['angular.json', '.angular-cli.json'],
        indicators: ['src/app/'],
        exclusiveWith: ['react', 'vue', 'svelte'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('@angular/core')) return 1.0;
          if (evidence.configs.includes('angular.json')) return 0.95;
          return 0;
        }
      },
      
      nextjs: {
        dependencies: ['next'],
        devDependencies: ['eslint-config-next'],
        scripts: ['next dev', 'next build', 'next start'],
        configs: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
        directories: ['pages/', 'app/', 'public/'],
        implies: ['react', 'typescript'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('next')) return 1.0;
          if (evidence.scripts && evidence.scripts.length > 0 && evidence.scripts.some(s => s.includes('next'))) return 0.95;
          if (evidence.configs.length > 0) return 0.9;
          return 0;
        }
      }
    };

    // Backend framework detectors
    this.backendDetectors = {
      express: {
        dependencies: ['express'],
        relatedPackages: ['body-parser', 'cors', 'helmet', 'morgan', 'compression', 'cookie-parser'],
        codePatterns: ['express()', 'app.use(', 'app.get(', 'app.post(', 'app.listen('],
        files: ['app.js', 'server.js', 'index.js'],
        exclusiveWith: ['fastify', 'koa', 'hapi'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('express')) return 1.0;
          const relatedCount = evidence.relatedPackages.length;
          if (relatedCount >= 3) return 0.9;
          if (relatedCount >= 2) return 0.7;
          if (evidence.codePatterns.length > 0) return 0.8;
          return 0;
        }
      },
      
      fastify: {
        dependencies: ['fastify'],
        codePatterns: ['fastify()', 'fastify.register'],
        exclusiveWith: ['express', 'koa', 'hapi'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('fastify')) return 1.0;
          return evidence.codePatterns && evidence.codePatterns.length > 0 ? 0.7 : 0;
        }
      },

      koa: {
        dependencies: ['koa'],
        codePatterns: ['koa()', 'koa2', 'app.use'],
        relatedPackages: ['koa-router', 'koa-bodyparser', 'koa-cors'],
        exclusiveWith: ['express', 'fastify', 'hapi'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('koa')) return 1.0;
          return evidence.codePatterns && evidence.codePatterns.length > 0 ? 0.7 : 0;
        }
      },
      
      nestjs: {
        dependencies: ['@nestjs/core', '@nestjs/common'],
        files: ['*.controller.ts', '*.service.ts', '*.module.ts'],
        configs: ['nest-cli.json'],
        implies: ['typescript'],
        indicators: ['src/modules/', 'src/controllers/'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('@nestjs/core')) return 1.0;
          if (evidence.configs.includes('nest-cli.json')) return 0.9;
          return evidence.files.length > 3 ? 0.8 : 0;
        }
      },

      // Python Web Frameworks
      fastapi: {
        dependencies: ['fastapi'],
        relatedPackages: ['uvicorn', 'starlette', 'pydantic'],
        codePatterns: ['FastAPI()', '@app.get', '@app.post', '@app.put', '@app.delete'],
        files: ['main.py', 'app.py', '**/main.py', '**/app.py'],
        configs: ['pyproject.toml', 'requirements.txt'],
        imports: ['from fastapi', 'import fastapi'],
        exclusiveWith: ['django', 'flask'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('fastapi')) return 1.0;
          if (evidence.relatedPackages.includes('uvicorn') && evidence.relatedPackages.includes('pydantic')) return 0.95;
          if (evidence.codePatterns.length > 0) return 0.9;
          if (evidence.imports.length > 0) return 0.85;
          return 0;
        }
      },

      django: {
        dependencies: ['django', 'Django'],
        relatedPackages: ['djangorestframework', 'django-cors-headers', 'psycopg2', 'psycopg2-binary'],
        files: ['manage.py', 'settings.py', 'urls.py', '**/settings.py', '**/urls.py'],
        configs: ['django.conf', 'requirements.txt', 'pyproject.toml'],
        indicators: ['*/migrations/', 'apps/', 'settings/'],
        imports: ['from django', 'import django', 'django.conf'],
        exclusiveWith: ['fastapi', 'flask'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('django') || evidence.dependencies.includes('Django')) return 1.0;
          if (evidence.files.includes('manage.py')) return 0.98;
          if (evidence.indicators.some(i => evidence.indicators.includes(i))) return 0.95;
          if (evidence.relatedPackages.includes('djangorestframework')) return 0.9;
          return 0;
        }
      },

      flask: {
        dependencies: ['flask', 'Flask'],
        relatedPackages: ['flask-restful', 'flask-cors', 'flask-sqlalchemy', 'gunicorn'],
        codePatterns: ['Flask(__name__)', '@app.route', 'app = Flask'],
        files: ['app.py', 'main.py', 'run.py', '**/app.py'],
        configs: ['requirements.txt', 'pyproject.toml'],
        imports: ['from flask', 'import flask'],
        exclusiveWith: ['fastapi', 'django'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('flask') || evidence.dependencies.includes('Flask')) return 1.0;
          if (evidence.codePatterns.length > 0) return 0.9;
          if (evidence.imports.length > 0) return 0.85;
          if (evidence.relatedPackages.some(pkg => ['flask-restful', 'flask-cors'].includes(pkg))) return 0.8;
          return 0;
        }
      }
    };

    // Database detectors
    this.databaseDetectors = {
      mongodb: {
        dependencies: ['mongodb', 'mongoose'],
        connectionStrings: ['mongodb://', 'mongodb+srv://'],
        dockerServices: ['mongo', 'mongodb'],
        envVars: ['MONGO_URI', 'MONGODB_URI', 'DATABASE_URL'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('mongoose')) return 1.0;
          if (evidence.dependencies.includes('mongodb')) return 0.95;
          if (evidence.dockerServices.length > 0) return 0.8;
          if (evidence.connectionStrings.length > 0) return 0.9;
          return 0;
        }
      },
      
      postgresql: {
        dependencies: ['pg', 'postgres', 'typeorm', 'sequelize', 'prisma', '@prisma/client', 
                       'psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg', 'sqlmodel', 'sqlalchemy'],
        connectionStrings: ['postgres://', 'postgresql://'],
        dockerServices: ['postgres', 'postgresql'],
        envVars: ['DATABASE_URL', 'POSTGRES_DB', 'PG_CONNECTION', 'POSTGRESQL_URL'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('pg')) return 1.0;
          if (evidence.dependencies.some(d => ['psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg'].includes(d))) return 1.0;
          if (evidence.dependencies.includes('sqlmodel')) return 0.95;
          if (evidence.dependencies.includes('sqlalchemy')) return 0.9;
          if (evidence.dependencies.includes('typeorm')) return 0.9;
          if (evidence.dockerServices.length > 0) return 0.85;
          return 0;
        }
      },
      
      mysql: {
        dependencies: ['mysql', 'mysql2'],
        connectionStrings: ['mysql://'],
        dockerServices: ['mysql', 'mariadb'],
        confidence: (evidence) => {
          if (evidence.dependencies.some(d => d.startsWith('mysql'))) return 1.0;
          if (evidence.dockerServices.length > 0) return 0.8;
          return 0;
        }
      },
      
      redis: {
        dependencies: ['redis', 'ioredis', 'bull', 'bee-queue'],
        connectionStrings: ['redis://'],
        dockerServices: ['redis'],
        usage: ['caching', 'sessions', 'queues', 'pubsub'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('ioredis')) return 1.0;
          if (evidence.dependencies.includes('redis')) return 0.95;
          if (evidence.dependencies.includes('bull')) return 0.9;
          return 0;
        }
      }
    };

    // Testing framework detectors
    this.testingDetectors = {
      jest: {
        dependencies: ['jest', '@types/jest'],
        devDependencies: ['jest', 'ts-jest', 'babel-jest'],
        configs: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
        packageJsonConfig: 'jest',
        files: ['*.test.js', '*.test.ts', '*.spec.js', '*.spec.ts'],
        setupFiles: ['jest.setup.js', 'setupTests.js'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('jest')) return 1.0;
          if (evidence.configs.length > 0) return 0.95;
          if (evidence.packageJsonConfig) return 0.95;
          return evidence.files.length > 0 ? 0.7 : 0;
        }
      },
      
      mocha: {
        dependencies: ['mocha'],
        devDependencies: ['mocha', 'chai', 'sinon'],
        configs: ['.mocharc.js', '.mocharc.json', 'mocha.opts'],
        files: ['*.test.js', '*.spec.js'],
        testDirectory: 'test/',
        confidence: (evidence) => {
          if (evidence.dependencies.includes('mocha')) return 1.0;
          if (evidence.configs.length > 0) return 0.9;
          return 0;
        }
      },
      
      cypress: {
        dependencies: ['cypress'],
        configs: ['cypress.json', 'cypress.config.js'],
        directories: ['cypress/integration', 'cypress/e2e'],
        type: 'e2e',
        confidence: (evidence) => {
          if (evidence.dependencies.includes('cypress')) return 1.0;
          if (evidence.configs.length > 0) return 0.9;
          return 0;
        }
      },
      
      playwright: {
        dependencies: ['@playwright/test'],
        configs: ['playwright.config.js', 'playwright.config.ts'],
        type: 'e2e',
        confidence: (evidence) => {
          if (evidence.dependencies.includes('@playwright/test')) return 1.0;
          return evidence.configs.length > 0 ? 0.9 : 0;
        }
      },

      // Python Testing Frameworks
      pytest: {
        dependencies: ['pytest'],
        relatedPackages: ['pytest-cov', 'pytest-asyncio', 'pytest-mock', 'httpx'],
        configs: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
        files: ['test_*.py', '*_test.py', 'tests/*.py'],
        directories: ['tests/', 'test/'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('pytest')) return 1.0;
          if (evidence.configs.some(c => ['pytest.ini', 'pyproject.toml'].includes(c))) return 0.9;
          if (evidence.files.length > 0) return 0.8;
          if (evidence.directories.length > 0) return 0.7;
          return 0;
        }
      },

      unittest: {
        files: ['test_*.py', '*_test.py', 'tests/*.py'],
        directories: ['tests/', 'test/'],
        codePatterns: ['unittest.TestCase', 'import unittest', 'from unittest'],
        confidence: (evidence) => {
          if (evidence.codePatterns.length > 0) return 0.9;
          if (evidence.files.length > 0 && evidence.directories.length > 0) return 0.7;
          return evidence.files.length > 0 ? 0.5 : 0;
        }
      }
    };

    // Build tool detectors
    this.buildToolDetectors = {
      webpack: {
        dependencies: ['webpack', 'webpack-cli'],
        configs: ['webpack.config.js', 'webpack.config.ts'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('webpack')) return 1.0;
          return evidence.configs.length > 0 ? 0.8 : 0;
        }
      },
      
      vite: {
        dependencies: ['vite'],
        configs: ['vite.config.js', 'vite.config.ts'],
        confidence: (evidence) => {
          if (evidence.dependencies.includes('vite')) return 1.0;
          return evidence.configs.length > 0 ? 0.9 : 0;
        }
      },

      // Python Build Tools
      poetry: {
        configs: ['pyproject.toml', 'poetry.lock'],
        indicators: ['poetry.toml'],
        confidence: (evidence) => {
          if (evidence.configs.includes('poetry.lock')) return 1.0;
          if (evidence.configs.includes('pyproject.toml')) return 0.8;
          return 0;
        }
      },
      
      uv: {
        configs: ['pyproject.toml', 'uv.lock'],
        indicators: ['.python-version', 'uv.toml'],
        confidence: (evidence) => {
          if (evidence.configs.includes('uv.lock')) return 1.0;
          if (evidence.indicators.includes('.python-version')) return 0.7;
          return 0;
        }
      },
      
      setuptools: {
        configs: ['setup.py', 'setup.cfg', 'pyproject.toml'],
        files: ['MANIFEST.in'],
        confidence: (evidence) => {
          if (evidence.configs.includes('setup.py')) return 1.0;
          if (evidence.configs.includes('setup.cfg')) return 0.9;
          return 0;
        }
      }
    };

    // Deployment detectors
    this.deploymentDetectors = {
      docker: {
        files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
        configs: ['.dockerignore'],
        confidence: (evidence) => {
          if (evidence.files.includes('Dockerfile')) return 1.0;
          if (evidence.files.some(f => f.includes('docker-compose'))) return 0.95;
          return 0;
        }
      },
      
      kubernetes: {
        files: ['k8s/', 'kubernetes/'],
        patterns: ['kind: Deployment', 'kind: Service', 'kind: Pod'],
        configs: ['skaffold.yaml', 'helm/Chart.yaml'],
        confidence: (evidence) => {
          if (evidence.files.length > 0) return 0.9;
          if (evidence.patterns.length > 0) return 0.95;
          return 0;
        }
      },
      
      githubActions: {
        files: ['.github/workflows/*.yml', '.github/workflows/*.yaml'],
        confidence: (evidence) => {
          return evidence.files.length > 0 ? 1.0 : 0;
        }
      }
    };

    // Mutual exclusions
    this.mutualExclusions = {
      'react': ['vue', 'angular', 'svelte'],
      'vue': ['react', 'angular', 'svelte'],
      'angular': ['react', 'vue', 'svelte'],
      'express': ['fastify', 'koa', 'hapi'],
      'jest': ['mocha', 'jasmine', 'ava'],
      'webpack': ['parcel'], // Some can coexist like webpack+vite
    };
  }

  /**
   * Main detection method
   */
  async detect(projectPath) {
    try {
      // Step 1: Detect languages (foundation)
      const languages = await this.detectLanguages(projectPath);
      
      // Step 2: Analyze project structure and type
      const projectAnalysis = await this.analyzeProjectStructure(projectPath);
      
      // Step 3: Read package.json if it exists
      const packageData = await this.readPackageJson(projectPath);
      
      // Step 4: Determine project type
      const projectType = await this.determineProjectType(
        projectPath, 
        projectAnalysis, 
        packageData
      );
      
      // Step 5: Perform targeted detection based on project type
      const detectionResults = await this.performTargetedDetection(
        projectPath,
        projectType,
        packageData,
        projectAnalysis
      );
      
      // Step 6: Apply confidence filtering and conflict resolution
      const resolved = this.resolveConflicts(detectionResults);

      // Step 7: Compile final results
      const finalFrameworks = resolved.frontend.concat(resolved.backend);
      
      // Determine primary language (not framework)
      const primaryLanguage = languages.length > 0 ? languages[0] : '';
      
      const result = {
        languages,
        type: projectType.type,
        primary: primaryLanguage, // Use primary language, not framework
        frameworks: finalFrameworks,
        databases: resolved.databases,
        testing: resolved.testing,
        buildTools: resolved.buildTools,
        deployment: resolved.deployment,
        patterns: resolved.patterns,
        architecture: projectAnalysis.architecture,
        packageManagers: await this.detectPackageManagers(projectPath),
        confidence: resolved.confidence
      };
      
      return result;
      
    } catch (error) {
      this.logger.error('Tech stack detection error:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * Detect programming languages with confidence
   */
  async detectLanguages(projectPath) {
    const detected = [];
    
    for (const [lang, config] of Object.entries(this.languageDetectors)) {
      const evidence = {
        files: [],
        configs: [],
        packageIndicators: [],
        indicators: []
      };
      
      // Check file patterns
      for (const pattern of config.patterns) {
        const files = await this.findFiles(projectPath, pattern);
        evidence.files.push(...files);
      }
      
      // Check config files
      if (config.configs) {
        for (const configFile of config.configs) {
          if (await this.fileExists(path.join(projectPath, configFile))) {
            evidence.configs.push(configFile);
          }
        }
      }
      
      // Check package indicators (for TypeScript)
      if (config.packageIndicators && evidence.configs.includes('package.json')) {
        const pkg = await this.readPackageJson(projectPath);
        const allDeps = Object.keys({
          ...pkg.dependencies || {},
          ...pkg.devDependencies || {}
        });
        
        evidence.packageIndicators = config.packageIndicators.filter(indicator =>
          allDeps.some(dep => dep.includes(indicator))
        );
      }
      
      // Calculate confidence
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push({
          language: lang,
          confidence,
          evidence
        });
      }
    }
    
    // Sort by confidence and return language names
    return detected
      .sort((a, b) => b.confidence - a.confidence)
      .map(d => d.language);
  }

  /**
   * Analyze project structure
   */
  async analyzeProjectStructure(projectPath) {
    const structure = {
      // Backend indicators
      hasApi: await this.dirExists(path.join(projectPath, 'api')),
      hasControllers: await this.dirExists(path.join(projectPath, 'controllers')),
      hasRoutes: await this.dirExists(path.join(projectPath, 'routes')),
      hasModels: await this.dirExists(path.join(projectPath, 'models')),
      hasServices: await this.dirExists(path.join(projectPath, 'services')),
      
      // Frontend indicators
      hasComponents: await this.dirExists(path.join(projectPath, 'components')) ||
                     await this.dirExists(path.join(projectPath, 'src/components')),
      hasPages: await this.dirExists(path.join(projectPath, 'pages')) ||
                await this.dirExists(path.join(projectPath, 'src/pages')),
      hasViews: await this.dirExists(path.join(projectPath, 'views')) ||
                await this.dirExists(path.join(projectPath, 'src/views')),
      hasPublic: await this.dirExists(path.join(projectPath, 'public')),
      
      // Common
      hasSrc: await this.dirExists(path.join(projectPath, 'src')),
      hasTests: await this.dirExists(path.join(projectPath, 'tests')) ||
                await this.dirExists(path.join(projectPath, 'test')) ||
                await this.dirExists(path.join(projectPath, '__tests__')),
      
      // Deployment
      hasDocker: await this.fileExists(path.join(projectPath, 'Dockerfile')),
      hasKubernetes: await this.dirExists(path.join(projectPath, 'k8s')) ||
                     await this.dirExists(path.join(projectPath, 'kubernetes'))
    };
    
    // Determine architecture patterns
    const architecture = {
      type: 'standard',
      patterns: []
    };
    
    // Check for monorepo
    if (await this.fileExists(path.join(projectPath, 'lerna.json')) ||
        await this.fileExists(path.join(projectPath, 'turbo.json')) ||
        await this.fileExists(path.join(projectPath, 'rush.json'))) {
      architecture.type = 'monorepo';
      architecture.patterns.push('monorepo');
    }
    
    // Check for microservices (based on docker-compose)
    if (await this.fileExists(path.join(projectPath, 'docker-compose.yml'))) {
      try {
        const content = await fs.readFile(path.join(projectPath, 'docker-compose.yml'), 'utf-8');
        const serviceCount = (content.match(/^\s*\w+:\s*$/gm) || []).length;
        if (serviceCount > 3) {
          architecture.patterns.push('microservices');
        }
      } catch (error) {
        // Ignore
      }
    }
    
    structure.architecture = architecture;
    return structure;
  }

  /**
   * Determine project type based on evidence
   */
  async determineProjectType(projectPath, structure, packageData) {
    const indicators = {
      backendOnly: 0,
      frontendOnly: 0,
      fullstack: 0,
      library: 0,
      cli: 0
    };
    
    // Backend indicators
    if (structure.hasApi || structure.hasControllers || structure.hasRoutes || structure.hasModels) {
      indicators.backendOnly += 3;
    }
    
    // Frontend indicators
    if (structure.hasComponents || structure.hasPages || structure.hasViews) {
      indicators.frontendOnly += 3;
    }
    
    // Check package.json for more evidence
    if (packageData) {
      const deps = Object.keys(packageData.dependencies || {});
      const devDeps = Object.keys(packageData.devDependencies || {});
      const allDeps = [...deps, ...devDeps];
      
      // Strong backend indicators
      const backendPackages = ['express', 'fastify', 'koa', 'nestjs', 'hapi', 'mongoose', 'typeorm', 'sequelize'];
      const backendCount = backendPackages.filter(pkg => allDeps.includes(pkg)).length;
      indicators.backendOnly += backendCount * 2;
      
      // Strong frontend indicators
      const frontendPackages = ['react', 'vue', 'angular', 'svelte', 'next', 'gatsby', 'nuxt'];
      const frontendCount = frontendPackages.filter(pkg => 
        allDeps.some(dep => dep.includes(pkg))
      ).length;
      indicators.frontendOnly += frontendCount * 2;
      
      // Check main/scripts for CLI indicators
      if (packageData.bin) {
        indicators.cli += 5;
      }
      
      // Library indicators
      if (packageData.main && !structure.hasApi && !structure.hasComponents) {
        indicators.library += 3;
      }
    }
    
    // Check Python dependencies for backend frameworks (even without package.json)
    const pythonDeps = await this.readPythonDependencies(projectPath);
    const pythonBackendPackages = ['fastapi', 'django', 'flask', 'tornado', 'aiohttp', 'sanic'];
    const pythonBackendCount = pythonBackendPackages.filter(pkg => pythonDeps.includes(pkg)).length;
    if (pythonBackendCount > 0) {
      indicators.backendOnly += pythonBackendCount * 3; // Higher weight for Python frameworks
    }
    
    // Determine type based on scores
    let type = 'unknown';
    let primary = '';
        
    if (indicators.cli > 3) {
      type = 'cli-tool';
    } else if (indicators.backendOnly > 0 && indicators.frontendOnly > 0) {
      type = 'full-stack-application';
    } else if (indicators.backendOnly > indicators.frontendOnly) {
      type = 'backend-api';
      // Determine primary backend framework
      if (packageData) {
        const deps = packageData.dependencies || {};
        if (deps.express) primary = 'express';
        else if (deps.fastify) primary = 'fastify';
        else if (deps['@nestjs/core']) primary = 'nestjs';
        else if (deps.koa) primary = 'koa';
      }
      
      // Check Python dependencies for backend frameworks
      const pythonDeps = await this.readPythonDependencies(projectPath);
      if (pythonDeps.includes('fastapi')) primary = 'fastapi';
      else if (pythonDeps.includes('django')) primary = 'django';
      else if (pythonDeps.includes('flask')) primary = 'flask';
    } else if (indicators.frontendOnly > indicators.backendOnly) {
      type = 'frontend-application';
      // Determine primary frontend framework
      if (packageData) {
        const deps = { ...packageData.dependencies || {}, ...packageData.devDependencies || {} };
        if (deps.react) primary = 'react';
        else if (deps.vue) primary = 'vue';
        else if (deps['@angular/core']) primary = 'angular';
        else if (deps.svelte) primary = 'svelte';
      }
    } else if (indicators.library > 0) {
      type = 'library';
    }
        
    return {
      type,
      primary,
      isBackendOnly: indicators.backendOnly > 0 && indicators.frontendOnly === 0,
      isFrontendOnly: indicators.frontendOnly > 0 && indicators.backendOnly === 0,
      scores: indicators
    };
  }

  /**
   * Perform targeted detection based on project type
   */
  async performTargetedDetection(projectPath, projectType, packageData, structure) {
    const results = {
      frontend: [],
      backend: [],
      databases: [],
      testing: [],
      buildTools: [],
      deployment: [],
      patterns: [],
      confidence: {}
    };
    
    // Only detect frontend if not backend-only
    if (!projectType.isBackendOnly) {
      results.frontend = await this.detectFrameworks(
        projectPath, 
        this.frontendDetectors, 
        packageData,
        projectType
      );
    }
    
    // Only detect backend if not frontend-only
    if (!projectType.isFrontendOnly) {
      results.backend = await this.detectFrameworks(
        projectPath,
        this.backendDetectors,
        packageData,
        projectType
      );
    }
    
    // Always detect these
    results.databases = await this.detectDatabases(projectPath, packageData);
    results.testing = await this.detectTesting(projectPath, packageData);
    results.buildTools = await this.detectBuildTools(projectPath, packageData);
    results.deployment = await this.detectDeployment(projectPath);
    
    // Collect all patterns
    results.patterns = [
      ...results.frontend,
      ...results.backend,
      ...results.databases,
      ...results.testing,
      ...results.buildTools,
      ...results.deployment
    ];
    
    return results;
  }

  /**
   * Generic framework detection
   */
  async detectFrameworks(projectPath, detectors, packageData, projectType) {
    const detected = [];
    
    // Read Python dependencies for Python frameworks
    const pythonDependencies = await this.readPythonDependencies(projectPath);
    
    for (const [framework, config] of Object.entries(detectors)) {
      const evidence = {
        dependencies: [],
        devDependencies: [],
        files: [],
        configs: [],
        codePatterns: [],
        relatedPackages: [],
        indicators: [],
        scripts: [],
        imports: [],
        isBackendOnly: projectType.isBackendOnly,
        isFrontendOnly: projectType.isFrontendOnly
      };
      
      // Check dependencies (JavaScript/TypeScript from package.json)
      if (packageData && config.dependencies) {
        const deps = packageData.dependencies || {};
        const devDeps = packageData.devDependencies || {};
        
        evidence.dependencies = config.dependencies.filter(dep => deps[dep]);
        evidence.devDependencies = (config.devDependencies || []).filter(dep => devDeps[dep]);
        
        // Check related packages
        if (config.relatedPackages) {
          evidence.relatedPackages = config.relatedPackages.filter(pkg => 
            deps[pkg] || devDeps[pkg]
          );
        }
        
        // Check scripts
        if (config.scripts && packageData.scripts) {
          const scripts = Object.values(packageData.scripts);
          evidence.scripts = config.scripts.filter(script => 
            scripts.some(s => s.includes(script.split(' ')[0]))
          );
        }
      }
      
      // Check Python dependencies for Python frameworks
      if (pythonDependencies.length > 0 && config.dependencies) {
        const pythonDeps = config.dependencies.filter(dep => 
          pythonDependencies.includes(dep)
        );
        evidence.dependencies.push(...pythonDeps);
        
        // Check related packages for Python
        if (config.relatedPackages) {
          const pythonRelated = config.relatedPackages.filter(pkg => 
            pythonDependencies.includes(pkg)
          );
          evidence.relatedPackages.push(...pythonRelated);
        }
      }
      
      // Check files
      if (config.files) {
        for (const pattern of config.files) {
          const files = await this.findFiles(projectPath, pattern);
          evidence.files.push(...files);
        }
      }
      
      // Check configs
      if (config.configs) {
        for (const configFile of config.configs) {
          if (await this.fileExists(path.join(projectPath, configFile))) {
            evidence.configs.push(configFile);
          }
        }
      }
      
      // Check indicators (directories)
      if (config.indicators) {
        for (const indicator of config.indicators) {
          if (await this.dirExists(path.join(projectPath, indicator))) {
            evidence.indicators.push(indicator);
          }
        }
      }
      
      // Check code patterns and imports (basic file scanning for Python frameworks)
      if ((config.codePatterns || config.imports) && evidence.files.length > 0) {
        const sampleFiles = evidence.files.slice(0, 3); // Sample first 3 files
        for (const file of sampleFiles) {
          try {
            const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
            
            if (config.codePatterns) {
              const foundPatterns = config.codePatterns.filter(pattern => 
                content.includes(pattern)
              );
              evidence.codePatterns.push(...foundPatterns);
            }
            
            if (config.imports) {
              const foundImports = config.imports.filter(imp => 
                content.includes(imp)
              );
              evidence.imports.push(...foundImports);
            }
          } catch (error) {
            // Continue silently if file can't be read
          }
        }
        
        // Remove duplicates
        evidence.codePatterns = [...new Set(evidence.codePatterns)];
        evidence.imports = [...new Set(evidence.imports)];
      }
      
      // Calculate confidence
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push({
          name: framework,
          confidence,
          evidence
        });
      }
    }
    
    // Sort by confidence and return names
    const result = detected
      .sort((a, b) => b.confidence - a.confidence)
      .map(d => d.name);
          
    return result;
  }

  /**
   * Detect databases
   */
  async detectDatabases(projectPath, packageData) {
    const detected = [];
    
    // Read Python dependencies for database detection
    const pythonDependencies = await this.readPythonDependencies(projectPath);
    
    for (const [db, config] of Object.entries(this.databaseDetectors)) {
      const evidence = {
        dependencies: [],
        connectionStrings: [],
        dockerServices: [],
        envVars: []
      };
      
      // Check JavaScript/Node.js dependencies
      if (packageData && config.dependencies) {
        const allDeps = Object.keys({
          ...packageData.dependencies || {},
          ...packageData.devDependencies || {}
        });
        
        evidence.dependencies = config.dependencies.filter(dep => 
          allDeps.includes(dep)
        );
        
        // Debug logging for database detection
        if (process.env.DEBUG_VIBE) {
          this.logger.log(`\nDetecting ${db}:`);
          this.logger.log('  Looking for:', config.dependencies);
          this.logger.log('  Found in package.json:', evidence.dependencies);
          this.logger.log('  All deps sample:', allDeps.slice(0, 5));
        }
      }
      
      // Check Python dependencies
      if (pythonDependencies.length > 0 && config.dependencies) {
        const pythonDbDeps = config.dependencies.filter(dep => 
          pythonDependencies.includes(dep)
        );
        evidence.dependencies.push(...pythonDbDeps);
        
        if (process.env.DEBUG_VIBE && pythonDbDeps.length > 0) {
          this.logger.log('  Found in Python deps:', pythonDbDeps);
        }
      }
      
      // Check docker-compose for services (including subdirectories)
      const dockerComposeFiles = [
        path.join(projectPath, 'docker-compose.yml'),
        path.join(projectPath, 'docker-compose.yaml'),
        path.join(projectPath, 'docker', 'docker-compose.yml'),
        path.join(projectPath, 'docker', 'docker-compose.yaml')
      ];
      
      if (config.dockerServices) {
        for (const dockerComposePath of dockerComposeFiles) {
          if (await this.fileExists(dockerComposePath)) {
            try {
              const content = await fs.readFile(dockerComposePath, 'utf-8');
              const foundServices = config.dockerServices.filter(service =>
                content.includes(`${service}:`) || content.includes(`image: ${service}`)
              );
              evidence.dockerServices.push(...foundServices);
            } catch (error) {
              // Ignore
            }
          }
        }
        // Remove duplicates
        evidence.dockerServices = [...new Set(evidence.dockerServices)];
      }
      
      // Check .env for connection strings
      const envPath = path.join(projectPath, '.env');
      const envExamplePath = path.join(projectPath, '.env.example');
      
      for (const envFile of [envPath, envExamplePath]) {
        if (await this.fileExists(envFile)) {
          try {
            const content = await fs.readFile(envFile, 'utf-8');
            if (config.connectionStrings) {
              evidence.connectionStrings = config.connectionStrings.filter(conn =>
                content.includes(conn)
              );
            }
            if (config.envVars) {
              evidence.envVars = config.envVars.filter(varName =>
                content.includes(varName)
              );
            }
          } catch (error) {
            // Ignore
          }
        }
      }
      
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push(db);
      }
    }
    
    return detected;
  }

  /**
   * Detect testing frameworks
   */
  async detectTesting(projectPath, packageData) {
    const detected = [];
    
    // Read Python dependencies for testing framework detection
    const pythonDependencies = await this.readPythonDependencies(projectPath);
    
    for (const [test, config] of Object.entries(this.testingDetectors)) {
      const evidence = {
        dependencies: [],
        devDependencies: [],
        configs: [],
        files: [],
        directories: [],
        codePatterns: [],
        packageJsonConfig: false
      };
      
      // Check JavaScript/Node.js dependencies
      if (packageData) {
        const deps = packageData.dependencies || {};
        const devDeps = packageData.devDependencies || {};
        
        evidence.dependencies = (config.dependencies || []).filter(dep => 
          deps[dep] || devDeps[dep]
        );
        evidence.devDependencies = (config.devDependencies || []).filter(dep =>
          devDeps[dep]
        );
        
        // Check package.json config
        if (config.packageJsonConfig && packageData[config.packageJsonConfig]) {
          evidence.packageJsonConfig = true;
        }
      }
      
      // Check Python dependencies
      if (pythonDependencies.length > 0 && config.dependencies) {
        const pythonTestDeps = config.dependencies.filter(dep => 
          pythonDependencies.includes(dep)
        );
        evidence.dependencies.push(...pythonTestDeps);
        
        // Check related packages for Python
        if (config.relatedPackages) {
          const pythonRelated = config.relatedPackages.filter(pkg => 
            pythonDependencies.includes(pkg)
          );
          evidence.relatedPackages = pythonRelated;
        }
      }
      
      // Check config files
      if (config.configs) {
        for (const configFile of config.configs) {
          if (await this.fileExists(path.join(projectPath, configFile))) {
            evidence.configs.push(configFile);
          }
        }
      }
      
      // Check directories
      if (config.directories) {
        for (const dir of config.directories) {
          if (await this.dirExists(path.join(projectPath, dir))) {
            evidence.directories.push(dir);
          }
        }
      }
      
      // Sample test files
      if (config.files) {
        for (const pattern of config.files) {
          const files = await this.findFiles(projectPath, pattern, 5); // Limit to 5 samples
          evidence.files.push(...files);
        }
      }
      
      // Check code patterns for Python testing
      if (config.codePatterns && evidence.files.length > 0) {
        const sampleFiles = evidence.files.slice(0, 2); // Sample first 2 files
        for (const file of sampleFiles) {
          try {
            const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
            const foundPatterns = config.codePatterns.filter(pattern => 
              content.includes(pattern)
            );
            evidence.codePatterns.push(...foundPatterns);
          } catch (error) {
            // Continue silently if file can't be read
          }
        }
        evidence.codePatterns = [...new Set(evidence.codePatterns)];
      }
      
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push(test);
      }
    }
    
    return detected;
  }

  /**
   * Detect build tools
   */
  async detectBuildTools(projectPath, packageData) {
    const detected = [];
    
    for (const [tool, config] of Object.entries(this.buildToolDetectors)) {
      const evidence = {
        dependencies: [],
        configs: [],
        files: [],
        indicators: []
      };
      
      // Check dependencies (for JavaScript/Node.js tools)
      if (packageData && config.dependencies) {
        const allDeps = Object.keys({
          ...packageData.dependencies || {},
          ...packageData.devDependencies || {}
        });
        
        evidence.dependencies = config.dependencies.filter(dep =>
          allDeps.includes(dep)
        );
      }
      
      // Check configs
      if (config.configs) {
        for (const configFile of config.configs) {
          if (await this.fileExists(path.join(projectPath, configFile))) {
            evidence.configs.push(configFile);
          }
        }
      }
      
      // Check files (for Python tools)
      if (config.files) {
        for (const file of config.files) {
          if (await this.fileExists(path.join(projectPath, file))) {
            evidence.files.push(file);
          }
        }
      }
      
      // Check indicators (for Python tools)
      if (config.indicators) {
        for (const indicator of config.indicators) {
          if (await this.fileExists(path.join(projectPath, indicator))) {
            evidence.indicators.push(indicator);
          }
        }
      }
      
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push(tool);
      }
    }
    
    return detected;
  }

  /**
   * Detect deployment tools
   */
  async detectDeployment(projectPath) {
    const detected = [];
    
    for (const [deployment, config] of Object.entries(this.deploymentDetectors)) {
      const evidence = {
        files: [],
        configs: [],
        patterns: []
      };
      
      // Check files
      if (config.files) {
        for (const file of config.files) {
          if (file.includes('*')) {
            const matches = await this.findFiles(projectPath, file);
            evidence.files.push(...matches);
          } else if (await this.fileExists(path.join(projectPath, file))) {
            evidence.files.push(file);
          }
        }
      }
      
      // Check configs
      if (config.configs) {
        for (const configFile of config.configs) {
          if (await this.fileExists(path.join(projectPath, configFile))) {
            evidence.configs.push(configFile);
          }
        }
      }
      
      const confidence = config.confidence(evidence);
      
      if (confidence >= 0.7) {
        detected.push(deployment);
      }
    }
    
    return detected;
  }

  /**
   * Resolve conflicts between mutually exclusive technologies
   */
  resolveConflicts(detectionResults) {
    const resolved = { ...detectionResults };
    
    // Apply mutual exclusions
    for (const [tech, exclusions] of Object.entries(this.mutualExclusions)) {
      // Check each category
      for (const category of ['frontend', 'backend', 'testing', 'buildTools']) {
        if (resolved[category].includes(tech)) {
          // Remove excluded technologies
          resolved[category] = resolved[category].filter(t => 
            !exclusions.includes(t)
          );
        }
      }
    }
    
    return resolved;
  }

  /**
   * Detect package managers
   */
  async detectPackageManagers(projectPath) {
    const managers = [];
    
    const checks = {
      npm: 'package-lock.json',
      yarn: 'yarn.lock',
      pnpm: 'pnpm-lock.yaml',
      bun: 'bun.lockb'
    };
    
    for (const [manager, lockfile] of Object.entries(checks)) {
      if (await this.fileExists(path.join(projectPath, lockfile))) {
        managers.push(manager);
      }
    }
    
    return managers;
  }

  // Utility methods
  
  async fileExists(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }
  
  async dirExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  
  async findFiles(projectPath, pattern, limit = 100) {
    try {
      const files = await glob(pattern, {
        cwd: projectPath,
        nodir: true,
        ignore: ['node_modules/**', 'vendor/**', 'dist/**', 'build/**', '.git/**'],
        maxDepth: 5
      });
      
      return limit ? files.slice(0, limit) : files;
    } catch (error) {
      return [];
    }
  }
  
  async readPackageJson(projectPath) {
    try {
      const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async readPythonDependencies(projectPath) {
    const dependencies = new Set();
        
    // Read pyproject.toml
    try {
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await this.fileExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf-8');
                
        // Parse main dependencies from [project] section using a robust approach
        // Look for the dependencies array within the [project] section
        const projectDepsRegex = /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/;
        const projectDepsMatch = content.match(projectDepsRegex);
        
        if (projectDepsMatch) {
          const depsList = projectDepsMatch[1];
          
          // Extract all quoted strings (dependencies)
          const depMatches = depsList.match(/"([^"]+)"/g);
          if (depMatches) {
            depMatches.forEach(dep => {
              // Remove quotes and extract package name before any version specifiers
              const fullDep = dep.replace(/"/g, '').trim();
              const packageName = fullDep.split(/[\[<>=~!\s]/)[0].trim();
              if (packageName && packageName !== 'python') {
                dependencies.add(packageName);
              }
            });
          }
        }
        
        // Parse dev-dependencies from [tool.uv] section
        const uvDepsRegex = /\[tool\.uv\][\s\S]*?dev-dependencies\s*=\s*\[([\s\S]*?)\]/;
        const uvDepsMatch = content.match(uvDepsRegex);
        
        if (uvDepsMatch) {
          const depsList = uvDepsMatch[1];
          const depMatches = depsList.match(/"([^"]+)"/g);
          
          if (depMatches) {
            depMatches.forEach(dep => {
              const fullDep = dep.replace(/"/g, '').trim();
              const packageName = fullDep.split(/[\[<>=~!\s]/)[0].trim();
              if (packageName && packageName !== 'python') {
                dependencies.add(packageName);
              }
            });
          }
        }
        
        // Check for Poetry dependencies
        const poetryDepsMatch = content.match(/\[tool\.poetry\.dependencies\][\s\S]*?(?=\[|\s*$)/);
        if (poetryDepsMatch) {
          const deps = poetryDepsMatch[0].match(/^([a-zA-Z0-9_-]+)\s*=/gm);
          if (deps) {
            deps.forEach(dep => {
              const name = dep.split('=')[0].trim();
              if (name !== 'python') dependencies.add(name);
            });
          }
        }
      }
    } catch (error) {
      // Continue silently
    }
    
    // Read requirements.txt
    try {
      const reqPath = path.join(projectPath, 'requirements.txt');
      if (await this.fileExists(reqPath)) {
        const content = await fs.readFile(reqPath, 'utf-8');
        const lines = content.split('\n');
        lines.forEach(line => {
          const cleaned = line.trim();
          if (cleaned && !cleaned.startsWith('#') && !cleaned.startsWith('-')) {
            const name = cleaned.split(/[>=<~!\[]/)[0].trim();
            if (name) dependencies.add(name);
          }
        });
      }
    } catch (error) {
      // Continue silently
    }
    
    const result = Array.from(dependencies);
    return result;
  }
  
  getEmptyResult() {
    return {
      languages: [],
      type: 'unknown',
      primary: '',
      frameworks: [],
      databases: [],
      testing: [],
      buildTools: [],
      deployment: [],
      patterns: [],
      architecture: { type: 'unknown', patterns: [] },
      packageManagers: []
    };
  }
}

module.exports = { TechStackDetector };