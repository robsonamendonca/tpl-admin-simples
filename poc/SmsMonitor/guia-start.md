# Guia de Inicialização do Ambiente de Desenvolvimento (Windows Server 2022 - Corporate)

Este guia documenta o processo de configuração do ambiente de desenvolvimento nativo Android (Kotlin) em uma máquina virtual corporativa com **Windows Server 2022**. 

O cenário considera as seguintes restrições:
1. Rede privada e restrita por **Proxy Corporativo**.
2. Máquina Virtual (VM) com muita RAM, mas **espaço em disco muito limitado**.
3. Políticas restritivas de permissões corporativas.

---

## 1. Estratégia para Baixo Espaço em Disco
Como o espaço em disco é crítico, **NÃO** instalaremos o Android Studio completo (que consome entre 5GB e 10GB). Em vez disso, utilizaremos uma abordagem minimalista de ferramentas de linha de comando.

### Requisitos Mínimos (Consumo Estimado: ~1GB a 2GB)
- **JDK (Java Development Kit) 17**: Apenas o runtime e ferramentas essenciais.
- **Android Command-line Tools**: Apenas para baixar o necessário do SDK.
- **VS Code**: Editor de código leve com extensões para Kotlin/Java.

### Configuração do Android SDK Minimalista
1. Baixe apenas o `commandlinetools-win` da página do Android Studio.
2. Descompacte em um diretório fixo, como `C:\android-sdk\cmdline-tools\latest`.
3. Utilize o comando `sdkmanager` (incluso no zip) para instalar **exclusivamente** os pacotes vitais para o build:
   ```powershell
   # Aceitar licenças
   yes | C:\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat --licenses
   
   # Baixar apenas as plataformas e ferramentas da API alvo (ex: API 33)
   C:\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

---

## 2. Configuração do Proxy Corporativo
Em ambientes fechados, o `Gradle` e o `sdkmanager` vão falhar ao tentar baixar as dependências e o pacote do Kotlin. Precisamos informar o proxy.

### A. Proxy no Gradle
Crie ou edite o arquivo `gradle.properties` na raiz do projeto (ou em `C:\Users\SEU_USUARIO\.gradle\gradle.properties`) e adicione:

```properties
# Configuração de Proxy HTTP
systemProp.http.proxyHost=proxy.suaempresa.com.br
systemProp.http.proxyPort=8080
systemProp.http.proxyUser=seu_usuario
systemProp.http.proxyPassword=sua_senha
systemProp.http.nonProxyHosts=localhost|127.0.0.1

# Configuração de Proxy HTTPS
systemProp.https.proxyHost=proxy.suaempresa.com.br
systemProp.https.proxyPort=8080
systemProp.https.proxyUser=seu_usuario
systemProp.https.proxyPassword=sua_senha
systemProp.https.nonProxyHosts=localhost|127.0.0.1
```

### B. Proxy no SDK Manager (Command-line)
Quando for executar o `sdkmanager` via terminal na empresa, passe os parâmetros de proxy na chamada:
```powershell
sdkmanager.bat --proxy=http --proxy_host=proxy.suaempresa.com.br --proxy_port=8080 "platform-tools"
```

---

## 3. Variáveis de Ambiente Essenciais
Certifique-se de configurar essas variáveis de ambiente no Windows Server (`Configurações Avançadas do Sistema > Variáveis de Ambiente`):

- **`JAVA_HOME`**: Apontando para o diretório do JDK (ex: `C:\Program Files\Java\jdk-17`).
- **`ANDROID_HOME`**: Apontando para o diretório do seu SDK minimalista (ex: `C:\android-sdk`).
- **`Path`**: Adicione `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools`, e `%ANDROID_HOME%\cmdline-tools\latest\bin`.

---

## 4. Problemas Comuns e Resoluções no Ambiente Corporativo

### ❌ Erro 1: Bloqueio de Firewall/Proxy em Certificados (SSL/TLS)
**O Problema:** Empresas costumam inspecionar o tráfego usando certificados de segurança próprios. O Gradle ou o SDK Manager podem acusar erro de SSL (SunCertPathBuilderException).
**A Solução:** Você precisa adicionar o Certificado Raiz (Root CA) da sua empresa na "cacerts" (Keystore) do Java que vai executar o Gradle.
```powershell
# Exemplo de comando keytool para importar certificado da empresa
keytool -import -trustcacerts -keystore "%JAVA_HOME%\lib\security\cacerts" -storepass changeit -alias proxy_empresa -file C:\caminho\para\certificado_empresa.cer
```

### ❌ Erro 2: Políticas de Execução do PowerShell Bloqueando o `gradlew`
**O Problema:** O Windows Server (através de GPOs de segurança) pode proibir a execução de scripts `.bat` ou `.ps1` que não foram assinados digitalmente.
**A Solução:**
- Se for via PowerShell, solicite autorização do administrador para mudar a política: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`.
- Execute utilizando diretamente o Command Prompt (cmd.exe) ao invés do PowerShell, pois frequentemente ele possui políticas menos restritas para arquivos `.bat` locais.

### ❌ Erro 3: Espaço em Disco Lotando Rapidamente
**O Problema:** Mesmo não usando o Android Studio, o Gradle realiza cache vigoroso de dependências (`.gradle/caches`) na pasta do usuário da VM.
**A Solução:** Limpe regularmente ou limite o uso do cache. Como vocês tem pouco espaço em disco, crie uma rotina ou script para apagar os caches não utilizados de tempos em tempos:
```powershell
# Apagar as versões antigas baixadas pelo wrapper do gradle
Remove-Item -Path "C:\Users\SEU_USUARIO\.gradle\wrapper\dists\*" -Recurse -Force
# Limpar caches de artefatos
Remove-Item -Path "C:\Users\SEU_USUARIO\.gradle\caches\modules-2\files-2.1\*" -Recurse -Force
```

### ❌ Erro 4: `adb` (Android Debug Bridge) Não Reconhece Aparelhos
**O Problema:** Ao conectar o celular na porta USB do "Cliente" via Área de Trabalho Remota (RDP) para dentro da VM do Windows Server, a VM não reconhecerá o hardware USB via RDP por padrão.
**A Solução:**
1. Você precisa habilitar o **Redirecionamento de Dispositivos USB RemoteFX** na máquina cliente e configurar a política (GPO) na VM do Windows Server.
2. Alternativamente (e mais simples), **Não conecte via cabo na VM**. Em vez disso, passe o APK construído da VM para a sua máquina física local por pastas compartilhadas e, da sua máquina local, instale o APK no seu aparelho físico.

---

## Resumo do Ciclo de Build na VM
Com o ambiente configurado, o desenvolvedor abrirá a pasta no VS Code, fará a edição do código em Kotlin, e chamará via terminal:
`.\gradlew build`

Se aprovado pelas regras do Proxy Corporativo e com o SDK mínimo devidamente instanciado no `local.properties` (ou `ANDROID_HOME`), o sistema gerará o arquivo APK sem exigir mais do que 1-2 GB em disco no Windows Server.
