import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Debit, Vehicle } from '../../model';
import { AlertController, LoadingController, ToastController, Loading } from 'ionic-angular';
import { DetranApiService } from '../../providers';
import { Clipboard } from '@ionic-native/clipboard';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'espm-debits',
  templateUrl: 'debits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DebitsComponent {
  constructor(
    private alertCtrl: AlertController,
    private api: DetranApiService,
    private loadingCtrl: LoadingController,
    private clipboard: Clipboard,
    private toastCtrl: ToastController
  ) {
  }

  @Input() vehicle: Vehicle;
  @Input() tipe: string;
  @Input() debits: Debit[];
  ids = [];
  loading: Loading;

  adicionaDebitos() {
    this.ids = this.debits.filter(debit => !!debit.flag.checked).map(id => id.idDebito);
  }
  generateBillet = () => {
    this.showLoading();
    this.adicionaDebitos();

    this.api
      .generateGRU(this.vehicle, this.ids, this.tipe)
      .pipe(finalize(this.dismissLoading))
      .subscribe(req => {
        this.dismissLoading();
        try {
          this.showGRUCode(
            req['itensGuia'][0]['codigoBarra'],
            req['itensGuia'][0]['linhaDigitavel'],
            'Valor: ' + this.getFormattedPrice(req['itensGuia'][0]['valorGuia'])
          );
        } catch {
          this.showGRUCode('', 'Não foi possível recuperar o código de barras', 'Código de barras');
        }
      });
  };

  getFormattedPrice(price: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  }

  showGRUCode = (codigo: string, str: string, title: string) => {
    let alert = this.alertCtrl.create({
      title: title,
      message: str,
      buttons: [
        {
          text: 'Baixar PDF',
          handler: () => {
            this.api.generatePDF(codigo);
            return true;
          }
        },
        {
          text: 'Copiar',
          handler: () => {
            if (str.match(/\d+/g)) {
              this.clipboard.copy(str);
              this.showMessage('Código de barras copiado!');
            }
            return true;
          }
        }
      ]
    });
    alert.present();
  };

  

  totalAmount = () => {
    let total = 0.0;
    for (let i = 0; i < this.debits.length; i++) {
      if (!(this.debits[i].parcela > 0)) {
        total += Number(this.debits[i].valorAtualizadoFranquia);
      }
    }
    return total;
  };


  ensureDebits = () => {
    return this.debits.filter(debit => !this.checkInstallment(debit));
  };

  checkInstallment = debit => {
    return debit.parcela > 0;
  };

  countDebits = () => {
    return this.ensureDebits().length;
  };

  private showLoading = (message: string = 'Aguarde') => {
    if (this.loading) {
      this.loading.setContent(message);
    } else {
      this.loading = this.loadingCtrl.create({ content: message, dismissOnPageChange: true });
      this.loading.present();
    }
  };

  private dismissLoading = () => {
    if (this.loading) {
      this.loading.dismiss().catch(console.log);
      this.loading = null;
    }
  };

  private showMessage = (message: string) => {
    this.toastCtrl.create({ message, duration: 4000 }).present();
  };
}
