const {ipcRenderer}  = require('electron')
const fs             = require('fs-extra')
const os             = require('os')
const path           = require('path')

const ConfigManager  = require('./configmanager')
const DistroManager  = require('./distromanager')
const LangLoader     = require('./langloader')
const { LoggerUtil } = require('helios-core')

const logger = LoggerUtil.getLogger('Preloader')

logger.info('Chargement..')

// Load ConfigManager
ConfigManager.load()

// Load Strings
LangLoader.loadLanguage('fr_CA')

function onDistroLoad(data){
    if(data != null){
        
        // Resolve the selected server if its value has yet to be set.
        if(ConfigManager.getSelectedServer() == null || data.getServer(ConfigManager.getSelectedServer()) == null){
            logger.info('Détermination du serveur sélectionné par défaut..')
            ConfigManager.setSelectedServer(data.getMainServer().getID())
            ConfigManager.save()
        }
    }
    ipcRenderer.send('distributionIndexDone', data != null)
}

// Ensure Distribution is downloaded and cached.
DistroManager.pullRemote().then((data) => {
    logger.info('Indice de distribution chargé.')

    onDistroLoad(data)

}).catch((err) => {
    logger.info('Échec du chargement de l\'index de distribution.')
    logger.error(err)

    logger.info('Tentative de chargement d\'une ancienne version de l\'index de distribution.')
    // Try getting a local copy, better than nothing.
    DistroManager.pullLocal().then((data) => {
        logger.info('Le chargement d\'une ancienne version de l\'index de distribution a réussi.')

        onDistroLoad(data)


    }).catch((err) => {

        logger.info('Échec du chargement d\'une ancienne version de l\'index de distribution.')
        logger.info('L\'application ne peut pas s\'exécuter.')
        logger.error(err)

        onDistroLoad(null)

    })

})

// Clean up temp dir incase previous launches ended unexpectedly. 
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if(err){
        logger.warn('Erreur lors du nettoyage du répertoire des natifs', err)
    } else {
        logger.info('Répertoire des natifs nettoyé.')
    }
})