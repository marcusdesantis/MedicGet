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
    // ─── BuildKit + cache compartida ───────────────────────────────────
    // DOCKER_BUILDKIT=1 activa el builder moderno (paralelo, layers más finos).
    // COMPOSE_DOCKER_CLI_BUILD=1 hace que `docker compose build` use buildx.
    // BUILDKIT_INLINE_CACHE=1 embebe metadata de cache en cada imagen,
    // así el siguiente build puede reusar layers de la imagen anterior
    // (incluso después de un `docker compose pull`). Esto baja el tiempo
    // de build de ~30min a ~10-15min cuando el código cambia poco, y a
    // ~2-3min cuando no cambia nada.
    DOCKER_BUILDKIT = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
    BUILDKIT_INLINE_CACHE = '1'
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
        // ─── Smart Build: solo rebuildea servicios cambiados ───────────
        // En vez de hacer `docker compose build` (que toca los 9), usamos
        // `git diff` entre el commit anterior deployado y el actual, y
        // mapeamos paths a servicios. Si solo cambió medicget-frontend/,
        // solo buildeamos `frontend`. Si tocaste packages/shared/ o el
        // root package-lock.json, sí buildeamos todo (porque todos lo
        // importan).
        //
        // La primera vez que corre (o si el git diff falla por commits
        // shallow), fall-backea a buildear todo para no romper.
        dir("${DEPLOY_DIR}") {
          sh '''
            set -e

            # Archivo donde guardamos el SHA del último deploy exitoso.
            LAST_SHA_FILE=".last-deployed-sha"
            CURRENT_SHA=$(git rev-parse HEAD)
            LAST_SHA=""
            [ -f "$LAST_SHA_FILE" ] && LAST_SHA=$(cat "$LAST_SHA_FILE" 2>/dev/null || true)

            # Determinar qué archivos cambiaron desde el último deploy.
            # Si es el primer deploy o el SHA viejo ya no existe en git,
            # forzamos build de TODO (modo seguro).
            CHANGED_FILES=""
            if [ -n "$LAST_SHA" ] && git cat-file -e "$LAST_SHA" 2>/dev/null; then
              CHANGED_FILES=$(git diff --name-only "$LAST_SHA" "$CURRENT_SHA" || true)
              echo "[smart-build] $(echo "$CHANGED_FILES" | wc -l) archivos cambiados desde $LAST_SHA"
            else
              echo "[smart-build] No hay SHA previo o cambió el historial — buildeando todo."
            fi

            # Mapeo path → servicio. Si algún archivo crítico cambió,
            # buildeamos todo (paths "globales").
            BUILD_ALL=false
            if [ -z "$CHANGED_FILES" ]; then
              BUILD_ALL=true
            elif echo "$CHANGED_FILES" | grep -qE '^(packages/shared/|package-lock\\.json$|package\\.json$|docker-compose\\.yml$|Dockerfile\\.service$|nginx/|prisma/)'; then
              echo "[smart-build] Cambio en archivo crítico → build de todo"
              BUILD_ALL=true
            fi

            SERVICES_TO_BUILD=""
            if [ "$BUILD_ALL" = "true" ]; then
              SERVICES_TO_BUILD="frontend svc-admin svc-appointment svc-auth svc-clinic svc-dashboard svc-doctor svc-patient svc-users"
            else
              echo "$CHANGED_FILES" | grep -q '^medicget-frontend/'                 && SERVICES_TO_BUILD="$SERVICES_TO_BUILD frontend"
              echo "$CHANGED_FILES" | grep -q '^services/svc-admin/'                && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-admin"
              echo "$CHANGED_FILES" | grep -q '^services/svc-appointment/'          && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-appointment"
              echo "$CHANGED_FILES" | grep -q '^services/svc-auth/'                 && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-auth"
              echo "$CHANGED_FILES" | grep -q '^services/svc-clinic/'               && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-clinic"
              echo "$CHANGED_FILES" | grep -q '^services/svc-dashboard/'            && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-dashboard"
              echo "$CHANGED_FILES" | grep -q '^services/svc-doctor/'               && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-doctor"
              echo "$CHANGED_FILES" | grep -q '^services/svc-patient/'              && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-patient"
              echo "$CHANGED_FILES" | grep -q '^services/svc-users/'                && SERVICES_TO_BUILD="$SERVICES_TO_BUILD svc-users"
              SERVICES_TO_BUILD=$(echo "$SERVICES_TO_BUILD" | xargs)
            fi

            if [ -z "$SERVICES_TO_BUILD" ]; then
              echo "[smart-build] Nada que buildear — solo recreamos contenedores con imágenes existentes."
            else
              echo "[smart-build] Buildeando: $SERVICES_TO_BUILD"
              docker compose build --pull $SERVICES_TO_BUILD
            fi

            docker compose up -d --remove-orphans
            docker compose ps

            echo "$CURRENT_SHA" > "$LAST_SHA_FILE"
          '''
        }
      }
    }

    stage('Restart nginx') {
      // Cuando los backends se recrean con un container_id nuevo, el nginx
      // sigue resolviendo el upstream al ID viejo y devuelve 502 hasta
      // que se reinicia.
      steps {
        dir("${DEPLOY_DIR}") {
          sh '''
            docker compose restart nginx
            sleep 2
            docker compose ps nginx
          '''
        }
      }
    }

    stage('Health check') {
      steps {
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
      sh '''
        cd ${DEPLOY_DIR} || exit 0
        docker compose ps
        docker compose logs --tail=80
      '''
    }
    always {
      sh 'docker image prune -f || true'
    }
  }
}
