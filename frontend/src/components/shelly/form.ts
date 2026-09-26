export type Mode = 'relay' | 'colour';

export type WizardForm = {
  hours: number;
  deadline: number;
  continuous: boolean;
  quiet: boolean;
  quietFrom: number;
  quietTo: number;
};

export const INITIAL_FORM: WizardForm = {
  hours: 3,
  deadline: 6,
  continuous: false,
  quiet: false,
  quietFrom: 8,
  quietTo: 17,
};
