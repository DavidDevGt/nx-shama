#!/bin/bash

# Shama Core Platform - Integration Tests Runner
# Ejecuta pruebas de integración usando Newman (Postman CLI)

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
COLLECTION_FILE="Shama-Core-Platform.postman_collection.json"
ENVIRONMENT_FILE="shama-postman-environment.json"
REPORT_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🚀 Shama Core Platform - Integration Tests${NC}"
echo -e "${BLUE}================================================${NC}"

# Verificar prerrequisitos
echo -e "\n${YELLOW}📋 Verificando prerrequisitos...${NC}"

if ! command -v newman &> /dev/null; then
    echo -e "${RED}❌ Newman no está instalado${NC}"
    echo -e "${YELLOW}Instala con: npm install -g newman newman-reporter-htmlextra${NC}"
    exit 1
fi

if [ ! -f "$COLLECTION_FILE" ]; then
    echo -e "${RED}❌ Archivo de colección no encontrado: $COLLECTION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerrequisitos verificados${NC}"

# Crear directorio de reportes
mkdir -p "$REPORT_DIR"

# Crear archivo de environment si no existe
if [ ! -f "$ENVIRONMENT_FILE" ]; then
    echo -e "\n${YELLOW}📝 Creando archivo de environment...${NC}"
    cat > "$ENVIRONMENT_FILE" << EOF
{
  "id": "shama-integration-env",
  "name": "Shama Integration Environment",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:5000",
      "type": "default",
      "enabled": true
    },
    {
      "key": "jwt_token",
      "value": "",
      "type": "any",
      "enabled": true
    },
    {
      "key": "customer_id",
      "value": "",
      "type": "any",
      "enabled": true
    },
    {
      "key": "product_id",
      "value": "",
      "type": "any",
      "enabled": true
    },
    {
      "key": "quotation_id",
      "value": "",
      "type": "any",
      "enabled": true
    }
  ]
}
EOF
    echo -e "${GREEN}✅ Archivo de environment creado${NC}"
fi

# Verificar que los servicios estén ejecutándose
echo -e "\n${YELLOW}🔍 Verificando servicios...${NC}"

if ! curl -f -s http://localhost:5000/health > /dev/null; then
    echo -e "${RED}❌ API Gateway no está respondiendo${NC}"
    echo -e "${YELLOW}Asegúrate de que los servicios estén ejecutándose:${NC}"
    echo -e "${YELLOW}  docker-compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Servicios verificados${NC}"

# Función para ejecutar tests
run_test_suite() {
    local suite_name=$1
    local folder_filter=$2
    local report_file="$REPORT_DIR/${suite_name,,}_$TIMESTAMP.html"

    echo -e "\n${BLUE}🧪 Ejecutando suite: $suite_name${NC}"

    if newman run "$COLLECTION_FILE" \
        --environment "$ENVIRONMENT_FILE" \
        --folder "$folder_filter" \
        --reporters cli,htmlextra \
        --reporter-htmlextra-export "$report_file" \
        --reporter-htmlextra-title "Shama Core - $suite_name" \
        --timeout 10000 \
        --delay-request 100; then

        echo -e "${GREEN}✅ Suite $suite_name completada exitosamente${NC}"
        echo -e "${YELLOW}📊 Reporte generado: $report_file${NC}"
        return 0
    else
        echo -e "${RED}❌ Suite $suite_name falló${NC}"
        echo -e "${YELLOW}📊 Reporte de error: $report_file${NC}"
        return 1
    fi
}

# Ejecutar suites de tests
echo -e "\n${BLUE}🎯 Iniciando pruebas de integración...${NC}"

FAILED_SUITES=0
TOTAL_SUITES=0

# Health Checks
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Health Checks" "Health Checks"; then
    echo -e "${GREEN}✅ Health Checks pasaron${NC}"
else
    echo -e "${RED}❌ Health Checks fallaron${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Products API
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Products API" "Products API"; then
    echo -e "${GREEN}✅ Products API pasó${NC}"
else
    echo -e "${RED}❌ Products API falló${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Customers API
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Customers API" "Customers API"; then
    echo -e "${GREEN}✅ Customers API pasó${NC}"
else
    echo -e "${RED}❌ Customers API falló${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Quotations API
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Quotations API" "Quotations API"; then
    echo -e "${GREEN}✅ Quotations API pasó${NC}"
else
    echo -e "${RED}❌ Quotations API falló${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Error Scenarios
TOTAL_SUITES=$((TOTAL_SUITES + 1))
if run_test_suite "Error Scenarios" "Error Scenarios"; then
    echo -e "${GREEN}✅ Error Scenarios pasaron${NC}"
else
    echo -e "${RED}❌ Error Scenarios fallaron${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

# Resultados finales
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}📊 RESULTADOS FINALES${NC}"
echo -e "${BLUE}================================================${NC}"

PASSED_SUITES=$((TOTAL_SUITES - FAILED_SUITES))

echo -e "${YELLOW}Suites ejecutadas: $TOTAL_SUITES${NC}"
echo -e "${GREEN}Suites exitosas: $PASSED_SUITES${NC}"
echo -e "${RED}Suites fallidas: $FAILED_SUITES${NC}"

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ¡Todas las pruebas pasaron exitosamente!${NC}"
    echo -e "${GREEN}✅ Integración completada${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Algunas pruebas fallaron${NC}"
    echo -e "${YELLOW}📊 Revisa los reportes en: $REPORT_DIR${NC}"
    echo -e "${YELLOW}🔍 Ejecuta: docker-compose logs para más detalles${NC}"
    exit 1
fi