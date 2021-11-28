import {AbstractModule, Component, ComponentSymbol, RegistryKey} from "@tmorin/ceb-inversion-core";
import {
    CommandBus,
    CommandBusSymbol,
    EventBus,
    EventBusSymbol,
    Gateway,
    GatewayEmitter,
    GatewayEmitterSymbol,
    GatewaySymbol,
    QueryBus,
    QueryBusSymbol
} from "@tmorin/ceb-messaging-core";
import {ipcMain, ipcRenderer} from "electron";
import {
    IpcMainCommandBus,
    IpcMainCommandBusSymbol,
    IpcMainEventBus,
    IpcMainEventBusSymbol,
    IpcMainGateway,
    IpcMainQueryBus,
    IpcMainQueryBusSymbol
} from "./ipc-main";
import {
    IpcRendererCommandBus,
    IpcRendererCommandBusSymbol,
    IpcRendererEventBus,
    IpcRendererEventBusSymbol,
    IpcRendererGateway,
    IpcRendererQueryBus,
    IpcRendererQueryBusSymbol
} from "./ipc-renderer";

/**
 * The options of {@link ElectronModule}.
 */
export interface ElectronModuleOptions {
    /**
     * The {@link RegistryKey} of the {@link IpcMainGateway} or {@link IpcRendererGateway} instance.
     * By default {@link GatewaySymbol}.
     */
    gatewayRegistryKey: RegistryKey
    /**
     * The {@link RegistryKey} of the {@link EventBus} instance.
     * By default {@link EventBusSymbol}.
     */
    eventsRegistryKey: RegistryKey
    /**
     * The {@link RegistryKey} of the {@link CommandBus} instance.
     * By default {@link CommandBusSymbol}.
     */
    commandsRegistryKey: RegistryKey
    /**
     * The {@link RegistryKey} of the {@link QueryBus} instance.
     * By default {@link QueryBusSymbol}.
     */
    queriesRegistryKey: RegistryKey
    /**
     * The {@link RegistryKey} of the {@link GatewayEmitter} instance.
     * By default {@link GatewayEmitterSymbol}.
     */
    emitterRegistryKey: RegistryKey
    /**
     * When `true`, the `error` internal events (i.e. `bus.on("error", ...)`) are displayed using `console.error(...)`.
     * By default `false`.
     */
    errorToConsole: boolean
}

/**
 * The module registers a {@link IpcMainGateway} or a {@link IpcRendererGateway} bound with the key {@link GatewaySymbol}.
 *
 * @example Register the module
 * ```typescript
 * import {ContainerBuilder} from "@tmorin/ceb-inversion-core"
 * import {SimpleGatewaySymbol, SimpleModule} from "@tmorin/ceb-messaging-simple";
 * import {ElectronModule} from "@tmorin/ceb-messaging-adapter-electron"
 * const container = ContainerBuilder.get()
 *   .module(new SimpleModule({gatewayRegistryKey: SimpleGatewaySymbol}))
 *   .module(new ElectronModule())
 *   .build()
 * ```
 */
export class ElectronModule extends AbstractModule {
    private readonly options: ElectronModuleOptions

    /**
     * @param wrappedGatewayRegistryKey The {@link RegistryKey} of the {@link Gateway} to wrap.
     * @param partialOptions Options of the module.
     */
    constructor(
        partialOptions: Partial<ElectronModuleOptions> = {}
    ) {
        super();
        this.options = {
            gatewayRegistryKey: GatewaySymbol,
            eventsRegistryKey: EventBusSymbol,
            commandsRegistryKey: CommandBusSymbol,
            queriesRegistryKey: QueryBusSymbol,
            emitterRegistryKey: GatewayEmitterSymbol,
            errorToConsole: false,
            ...partialOptions
        }
    }

    async configure(): Promise<void> {
        if (ipcMain) {
            // EVENT BUS
            this.registry.registerFactory<IpcMainEventBus>(IpcMainEventBusSymbol, (registry) => new IpcMainEventBus(
                ipcMain,
                registry.resolve<EventBus>(this.options.eventsRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // COMMAND BUS
            this.registry.registerFactory<IpcMainCommandBus>(IpcMainCommandBusSymbol, (registry) => new IpcMainCommandBus(
                ipcMain,
                registry.resolve<CommandBus>(this.options.commandsRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // QUERY BUS
            this.registry.registerFactory<IpcMainQueryBus>(IpcMainQueryBusSymbol, (registry) => new IpcMainQueryBus(
                ipcMain,
                registry.resolve<QueryBus>(this.options.queriesRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // GATEWAY
            this.registry.registerFactory<IpcMainGateway>(this.options.gatewayRegistryKey, (registry) => {
                return new IpcMainGateway(
                    registry.resolve<IpcMainEventBus>(IpcMainEventBusSymbol),
                    registry.resolve<IpcMainCommandBus>(IpcMainCommandBusSymbol),
                    registry.resolve<IpcMainQueryBus>(IpcMainQueryBusSymbol),
                );
            })
        }

        if (ipcRenderer) {
            // EVENT BUS
            this.registry.registerFactory<IpcRendererEventBus>(IpcRendererEventBusSymbol, (registry) => new IpcRendererEventBus(
                ipcRenderer,
                registry.resolve<EventBus>(this.options.eventsRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // COMMAND BUS
            this.registry.registerFactory<IpcRendererCommandBus>(IpcRendererCommandBusSymbol, (registry) => new IpcRendererCommandBus(
                ipcRenderer,
                registry.resolve<CommandBus>(this.options.commandsRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // QUERY BUS
            this.registry.registerFactory<IpcRendererQueryBus>(IpcRendererQueryBusSymbol, (registry) => new IpcRendererQueryBus(
                ipcRenderer,
                registry.resolve<QueryBus>(this.options.queriesRegistryKey),
                registry.resolve<GatewayEmitter>(this.options.emitterRegistryKey),
            ))
            // GATEWAY
            this.registry.registerFactory<IpcRendererGateway>(this.options.gatewayRegistryKey, (registry) => {
                return new IpcRendererGateway(
                    registry.resolve<IpcRendererEventBus>(IpcRendererEventBusSymbol),
                    registry.resolve<IpcRendererCommandBus>(IpcRendererCommandBusSymbol),
                    registry.resolve<IpcRendererQueryBus>(IpcRendererQueryBusSymbol),
                );
            })
        }

        this.registry.registerFactory<Component>(ComponentSymbol, (registry) => ({
            configure: async () => {
                if (this.options.errorToConsole) {
                    const observer = registry.resolve<IpcMainGateway | IpcRendererGateway>(this.options.gatewayRegistryKey).observer
                    // COMMAND
                    observer.on("command_handler_failed", ({command, error}) => {
                        const identifier = `${command.headers.messageType}/${command.headers.messageId}`
                        const message = `ElectronModule - a command handler of ${identifier} throws an error`
                        console.error(message, error)
                    })
                    observer.on("command_handler_not_found", ({error}) => {
                        console.debug("ElectronModule - a command handler cannot be found", error.message)
                    })
                    observer.on("command_forward_failed", ({error, command}) => {
                        const identifier = `${command.headers.messageType}/${command.headers.messageId}`
                        const message = `ElectronModule - a command handler of ${identifier} throws an error`
                        console.trace(message, error);
                    })
                    // QUERY
                    observer.on("query_handler_failed", ({query, error}) => {
                        const identifier = `${query.headers.messageType}/${query.headers.messageId}`
                        const message = `ElectronModule - a query handler of ${identifier} throws an error`
                        console.error(message, error)
                    })
                    observer.on("query_handler_not_found", ({error}) => {
                        console.debug("ElectronModule - a query handler cannot be found", error.message)
                    })
                    // EVENT
                    observer.on("event_listener_failed", ({event, error}) => {
                        const identifier = `${event.headers.messageType}/${event.headers.messageId}`
                        const message = `ElectronModule - an event listener of ${identifier} throws an error`
                        console.error(message, error)
                    })
                    observer.on("event_forward_failed", ({event, error}) => {
                        const identifier = `${event.headers.messageType}/${event.headers.messageId}`
                        const message = `ElectronModule - an event listener of ${identifier} throws an error`
                        console.trace(message, error);
                    })
                }
            },
            dispose: async () => {
                await registry.resolve<Gateway>(this.options.gatewayRegistryKey).dispose()
            }
        }))

    }
}
