// =============================================================================
// Jenkinsfile — pipeline declarativo para deploy de MedicGet al VPS.
//
// Estrategia: build & deploy en el mismo host donde corre Jenkins.
//   1. Checkout del repo (Jenkins lo trae a su workspace)
//   2. Sincronizar el checkout a /proyectos/opt/medicget (donde vive el .env de prod)
//   3. docker compose up -d --build → reconstruye lo que cambió y reemplaza contenedores
//   4. Smoke test del endpoint de health
//
// Para que esto funcione necesitás:
//   • Jenkins corriendo con acceso al docker.sock del host (ver guía).
//   • /proyectos/opt/medicget existe y contiene el .env con las vars de producción.
//   • El usuario `jenkins` (UID 1000 dentro del container) puede escribir
//     en /proyectos/opt/medicget (ya lo dejaste con chown deploy:deploy y montaste
//     el volumen; si tenés permission errors, ajustá ACLs).
// =============================================================================

pipeline {
  agent any

  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()                    // un deploy a la vez
  }

  environment {
    DEPLOY_DIR = '/proyectos/opt/medicget'
    COMPOSE_PROJECT_NAME = 'medicget'
  }

  stages {

    stage('Checkout') {
      steps {
        // Jenkins ya clona el repo automáticamente en el workspace cuando
        // el job está configurado con el git URL. Este stage es solo
        // diagnóstico — muestra el último commit que se va a deployar.
        sh '''
          echo "Commit:    $(git rev-parse --short HEAD)"
          echo "Branch:    ${GIT_BRANCH:-unknown}"
          echo "Author:    $(git log -1 --pretty=%an)"
          echo "Subject:   $(git log -1 --pretty=%s)"
        '''
      }
    }

    stage('Sync sources to /proyectos/opt/medicget') {
      steps {
        // Rsync del workspace a la carpeta de deploy. Preservamos el .env
        // (no está en git pero sí en /proyectos/opt/medicget). Por eso excluimos
        // .env del rsync con --exclude.
        sh '''
          rsync -a --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='.env' \
            --exclude='.env.*' \
            ./ ${DEPLOY_DIR}/
        '''
      }
    }

    stage('Run DB migrations') {
      steps {
        // Aplicar migraciones ANTES de levantar los servicios — sino el
        // código nuevo puede intentar usar tablas que aún no existen y
        // tirar errores en producción.
        //
        // `--profile tools` activa el servicio prisma (que está oculto por
        // default). `run --rm` lo ejecuta one-shot y borra el container.
        // `prisma:deploy` aplica solo migraciones pendientes — es
        // idempotente, así que correrlo en cada deploy no rompe nada
        // aunque no haya migraciones nuevas.
        //
        // Si el build de la imagen prisma falla (p. ej. cambios al schema
        // que rompen la generación del client), el deploy aborta acá —
        // queremos que sea así para no dejar la DB en un estado
        // inconsistente con el código deployado.
        dir("${DEPLOY_DIR}") {
          sh '''
            docker compose --profile tools build prisma
            docker compose --profile tools run --rm prisma
          '''
        }
      }
    }

    stage('Build & deploy') {
      steps {
        // El docker-compose.yml vive en la raíz; lo ejecutamos desde
        // /proyectos/opt/medicget para que respete las rutas relativas y el .env.
        dir("${DEPLOY_DIR}") {
          sh '''
            docker compose pull --ignore-pull-failures || true
            docker compose up -d --build --remove-orphans
            docker compose ps
          '''
        }
      }
    }

    stage('Health check') {
      steps {
        // Esperamos a que el gateway responda. Si no levanta en 60s, falla.
        sh '''
          for i in $(seq 1 30); do
            if curl -fsS http://localhost:8080/health > /dev/null 2>&1; then
              echo "✓ Backend up"
              exit 0
            fi
            echo "Esperando backend (${i}/30)..."
            sleep 2
          done
          echo "✗ Backend no respondió tras 60s"
          docker compose logs --tail=50 nginx
          exit 1
        '''
      }
    }
  }

  post {
    success {
      echo "✓ Deploy exitoso del commit ${env.GIT_COMMIT?.take(7)}"
    }
    failure {
      echo "✗ Deploy falló. Ver logs arriba."
      // Útil para diagnóstico cuando el build revienta:
      sh '''
        cd ${DEPLOY_DIR} || exit 0
        docker compose ps
        docker compose logs --tail=80
      '''
    }
    always {
      // Cleanup de imágenes huérfanas (capas viejas) para no llenar el disco.
      // Mantiene la última imagen de cada servicio, borra layers no usados.
      sh 'docker image prune -f || true'
    }
  }
}
